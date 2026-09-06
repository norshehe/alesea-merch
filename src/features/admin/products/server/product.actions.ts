"use server";

import { requireAdmin } from "@/features/admin/server/auth";
import {
  revalidateAllProducts,
  revalidateProduct,
} from "@/features/admin/server/revalidate";
import {
  productSchema,
  type ProductFormValues,
  type ProductStatus,
  type ProductValues,
} from "@/features/admin/products/schemas/product.schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MEDIA_BUCKET } from "@/lib/supabase/storage";

/**
 * Write path for products. Every export starts with `requireAdmin()` — RLS is
 * the real gate, but an unauthenticated caller should get a redirect, not a
 * confusing permission error from Postgres.
 *
 * Every action re-parses its input server-side: the client schema is a UX
 * affordance, not a security boundary.
 *
 * Images are handled as ROWS only. Storage objects are uploaded and deleted by
 * the browser (see `ImageUploadField`) because a Server Action body caps at
 * ~1MB; the one exception is `deleteProduct`, which has no client to do it.
 */

type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : T))
  | { ok: false; error: string };

interface IPostgresError {
  code?: string;
  message: string;
}

function isPostgresError(error: unknown): error is IPostgresError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

/**
 * Translate a constraint violation into something an operator can act on.
 * The raw error is logged, never returned — it carries SQL and column names.
 */
function toMessage(error: unknown, fallback: string): string {
  if (!isPostgresError(error)) return fallback;

  const message = error.message;

  if (error.code === "23505") {
    if (message.includes("products_slug_key")) {
      return "That slug is already used by another product.";
    }
    if (message.includes("product_images_path_key")) {
      return "One of those images is already attached to another product.";
    }
    return "Something with that value already exists.";
  }

  if (error.code === "23514") {
    if (message.includes("products_price_or_coming_soon")) {
      return "A product with no price must be marked as coming soon.";
    }
    if (message.includes("products_slug_format")) {
      return "Slug must be lowercase words separated by single dashes.";
    }
    if (message.includes("products_colors_shape")) {
      return "Every colour needs a name and a 6-digit hex value.";
    }
    return "That change breaks a database rule — check price, slug and colours.";
  }

  return fallback;
}

/** Zod issue → the sentence the operator sees. */
function firstIssue(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Some fields need attention.";
}

function toRow(values: ProductValues) {
  return {
    slug: values.slug,
    title: values.title,
    category: values.category,
    price: values.price,
    currency: values.currency,
    blurb: values.blurb,
    materials: values.materials,
    size_label: values.sizeLabel,
    sizes: values.sizes,
    colors: values.colors,
    coming_soon: values.comingSoon,
    sort_order: values.sortOrder,
    status: values.status,
  };
}

/**
 * Replace the image rows for a product.
 *
 * Delete-then-insert rather than a diff: the set is under ten rows, `position`
 * is just the array index, and a diff would be more code with more ways to
 * leave the order wrong. Storage objects are untouched — the browser already
 * removed the ones the operator deleted.
 */
async function replaceImages(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  productId: string,
  images: ProductValues["images"],
) {
  const { error: deleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("product_id", productId);
  if (deleteError) throw deleteError;

  if (images.length === 0) return;

  const { error: insertError } = await supabase.from("product_images").insert(
    images.map((image, index) => ({
      product_id: productId,
      storage_path: image.path,
      alt: image.alt,
      width: image.width,
      height: image.height,
      position: index,
    })),
  );
  if (insertError) throw insertError;
}

/** Create (`id === null`) or update a product, plus its image rows. */
export async function saveProduct(
  id: string | null,
  values: ProductFormValues,
): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdmin();

  const parsed = productSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: firstIssue(parsed.error.issues) };
  }

  const supabase = await createSupabaseServerClient();
  const row = toRow(parsed.data);

  try {
    if (id === null) {
      const { data, error } = await supabase
        .from("products")
        .insert(row)
        .select("id, slug")
        .single();
      if (error) throw error;

      await replaceImages(supabase, data.id, parsed.data.images);
      revalidateProduct(data.slug);
      return { ok: true, id: data.id, slug: data.slug };
    }

    // Read the current slug BEFORE the update so a rename can also invalidate
    // the old public URL.
    const { data: existing, error: readError } = await supabase
      .from("products")
      .select("slug")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw readError;
    if (!existing) return { ok: false, error: "That product no longer exists." };

    const { data, error } = await supabase
      .from("products")
      .update(row)
      .eq("id", id)
      .select("id, slug")
      .single();
    if (error) throw error;

    await replaceImages(supabase, id, parsed.data.images);
    revalidateProduct(data.slug, existing.slug);
    return { ok: true, id: data.id, slug: data.slug };
  } catch (error) {
    console.error("[admin-products] save failed", error);
    return { ok: false, error: toMessage(error, "Could not save this product.") };
  }
}

/**
 * Delete a product, its image rows (via cascade) AND its Storage objects.
 *
 * The objects must go too: nothing else ever references them again, and the
 * bucket would otherwise grow forever. Paths are read first, because the
 * cascade destroys the only record of them.
 */
export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();

  try {
    const { data: images, error: readError } = await supabase
      .from("product_images")
      .select("storage_path")
      .eq("product_id", id);
    if (readError) throw readError;

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;

    const paths = (images ?? []).map((image) => image.storage_path);
    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .remove(paths);
      // Best effort: the product is already gone. Orphaned bytes are a cleanup
      // chore, not a failure worth showing the operator.
      if (storageError) {
        console.error("[admin-products] storage cleanup failed", storageError);
      }
    }

    revalidateAllProducts();
    return { ok: true };
  } catch (error) {
    console.error("[admin-products] delete failed", error);
    return { ok: false, error: toMessage(error, "Could not delete this product.") };
  }
}

/**
 * Move a product one place up or down in the storefront order.
 *
 * The whole list is renumbered from its current order rather than swapping two
 * `sort_order` values: every product ships with `sort_order = 0` by default, and
 * swapping two zeroes changes nothing at all. Only rows whose number actually
 * changes are written.
 */
export async function reorderProduct(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();

  try {
    // Same ordering the list and the storefront use, so "up" means what the
    // operator just saw on screen.
    const { data, error } = await supabase
      .from("products")
      .select("id, sort_order")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });
    if (error) throw error;

    const rows = data ?? [];
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) return { ok: false, error: "That product no longer exists." };

    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= rows.length) return { ok: true };

    const ordered = [...rows];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

    const updates = ordered
      .map((row, position) => ({ id: row.id, position, previous: row.sort_order }))
      .filter((row) => row.position !== row.previous);

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("products")
        .update({ sort_order: update.position })
        .eq("id", update.id);
      if (updateError) throw updateError;
    }

    revalidateAllProducts();
    return { ok: true };
  } catch (error) {
    console.error("[admin-products] reorder failed", error);
    return { ok: false, error: toMessage(error, "Could not reorder products.") };
  }
}

/** Publish or unpublish a product without opening the form. */
export async function setProductStatus(
  id: string,
  status: ProductStatus,
): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();

  try {
    const { data, error } = await supabase
      .from("products")
      .update({ status })
      .eq("id", id)
      .select("slug")
      .single();
    if (error) throw error;

    revalidateProduct(data.slug);
    return { ok: true };
  } catch (error) {
    console.error("[admin-products] status change failed", error);
    return { ok: false, error: toMessage(error, "Could not change the status.") };
  }
}
