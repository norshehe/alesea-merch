"use server";

import { requireAdmin } from "@/features/admin/server/auth";
import {
  firstIssue,
  notWrittenMessage,
  toActionMessage,
  type ActionResult,
  type ConstraintMessages,
} from "@/features/admin/server/action-result";
import { revalidateStorefrontProducts } from "@/features/admin/server/revalidate";
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
 * Image BYTES are uploaded by the browser (see `ImageUploadField`) because a
 * Server Action body caps at ~1MB. They are DELETED here, and only here: the
 * browser used to delete on remove, which destroyed the object of a live
 * product the moment the operator changed their mind and hit Cancel.
 */

/** Constraint names this table can raise, in operator language. */
const PRODUCT_CONSTRAINTS: ConstraintMessages = {
  products_slug_key: "That slug is already used by another product.",
  product_images_path_key:
    "One of those images is already attached to another product.",
  products_price_or_coming_soon:
    "A product with no price must be marked as coming soon.",
  products_slug_format:
    "Slug must be lowercase words separated by single dashes.",
  products_colors_shape: "Every colour needs a name and a 6-digit hex value.",
};

function toMessage(error: unknown, fallback: string): string {
  return toActionMessage(error, fallback, PRODUCT_CONSTRAINTS);
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
 * Bring the image ROWS for a product in line with what the form submitted, and
 * report which storage paths are no longer referenced.
 *
 * ⚠️ INSERT FIRST, DELETE AFTER. The previous version deleted every row for the
 * product and then inserted the new set, so a failed insert — a duplicate
 * `storage_path`, an expired session — left a live product with ZERO images,
 * permanently, behind an error message that said nothing about the gallery. In
 * this order the same failure leaves stale rows, which are visible, editable,
 * and fixable by pressing Save again.
 *
 * `upsert` on `storage_path` (a real unique constraint, `product_images_path_key`)
 * rather than a diff: `position` is just the array index, and re-upserting an
 * unchanged row is free.
 */
async function writeImages(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  productId: string,
  images: ProductValues["images"],
): Promise<string[]> {
  const { data: before, error: readError } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", productId);
  if (readError) throw readError;

  if (images.length > 0) {
    const { error: upsertError } = await supabase.from("product_images").upsert(
      images.map((image, index) => ({
        product_id: productId,
        storage_path: image.path,
        alt: image.alt,
        width: image.width,
        height: image.height,
        position: index,
      })),
      { onConflict: "storage_path" },
    );
    if (upsertError) throw upsertError;
  }

  const keep = new Set(images.map((image) => image.path));
  const stale = (before ?? [])
    .map((row) => row.storage_path)
    .filter((path) => !keep.has(path));

  if (stale.length > 0) {
    const { error: deleteError } = await supabase
      .from("product_images")
      .delete()
      .eq("product_id", productId)
      .in("storage_path", stale);
    if (deleteError) throw deleteError;
  }

  return stale;
}

/**
 * Drop storage objects nothing points at any more. Best effort by design: the
 * rows are already correct, so a failure costs bytes, not a broken product.
 *
 * ⚠️ This is the ONLY place a save deletes bytes, and it runs after the rows
 * are committed. An upload for a product that is never created still leaks its
 * object — accepted deliberately: the fix is a periodic sweep of `media`
 * against `product_images`/`shop_categories`, not more code on this path.
 */
async function removeStorageObjects(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  paths: string[],
) {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(paths);
  if (error) console.error("[admin-products] storage cleanup failed", error);
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

      let stale: string[];
      try {
        stale = await writeImages(supabase, data.id, parsed.data.images);
      } catch (imageError) {
        // There is no transaction across these two writes: the product row is
        // already committed. Roll it back so the operator can fix the images
        // and press Create again — otherwise the form stays in create mode and
        // every retry hits the slug unique constraint, forever, on a product
        // they cannot see.
        const { error: rollbackError } = await supabase
          .from("products")
          .delete()
          .eq("id", data.id)
          .select("id");

        if (rollbackError) {
          console.error(
            "[admin-products] create rollback failed",
            rollbackError,
          );
          console.error("[admin-products] create image write failed", imageError);
          return {
            ok: false,
            error:
              "The product was created but its images could not be saved, and it could not be removed again. Open it from the products list and fix the images there.",
          };
        }
        throw imageError;
      }

      await removeStorageObjects(supabase, stale);
      revalidateStorefrontProducts();
      return { ok: true, id: data.id, slug: data.slug };
    }

    // `.select()` on the UPDATE is not decoration: PostgREST reports no error
    // when a write matches nothing, and an RLS-denied write IS a zero-row write.
    const { data, error } = await supabase
      .from("products")
      .update(row)
      .eq("id", id)
      .select("id, slug");
    if (error) throw error;
    if (!data || data.length === 0) {
      return { ok: false, error: notWrittenMessage("product") };
    }

    const saved = data[0];
    const stale = await writeImages(supabase, id, parsed.data.images);
    await removeStorageObjects(supabase, stale);

    revalidateStorefrontProducts();
    return { ok: true, id: saved.id, slug: saved.slug };
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

    const { data, error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      return { ok: false, error: notWrittenMessage("product") };
    }

    await removeStorageObjects(
      supabase,
      (images ?? []).map((image) => image.storage_path),
    );

    revalidateStorefrontProducts();
    return { ok: true };
  } catch (error) {
    console.error("[admin-products] delete failed", error);
    return { ok: false, error: toMessage(error, "Could not delete this product.") };
  }
}

/**
 * Move a product one place up or down in the storefront order.
 *
 * ⚠️ There is no transaction here — PostgREST cannot wrap several statements in
 * one, and adding a database function is out of scope for this change. So the
 * write set is kept as small as it can be, and a partial failure is REPORTED as
 * partial rather than as a plain error, because the list order really is wrong
 * at that point.
 *
 * Two rows are enough whenever the pair's `sort_order` values differ. They do
 * not differ the first time: every product ships with `sort_order = 0` and ties
 * break on title, so swapping two zeroes changes nothing at all. That one case
 * renumbers the list from its current order, after which every row has a
 * distinct number and later reorders are two writes again.
 *
 * Two admins reordering at once still interleave; the fix for that is a
 * database function holding a row lock, not more client-side care.
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
    // Already at the end — a no-op, not an error.
    if (target < 0 || target >= rows.length) return { ok: true };

    const updates = planReorder(rows, index, target);

    let applied = 0;
    for (const update of updates) {
      const { data: written, error: updateError } = await supabase
        .from("products")
        .update({ sort_order: update.sortOrder })
        .eq("id", update.id)
        .select("id");
      if (updateError || !written || written.length === 0) {
        if (updateError) {
          console.error("[admin-products] reorder write failed", updateError);
        }
        revalidateStorefrontProducts();
        return {
          ok: false,
          error:
            applied === 0
              ? notWrittenMessage("product")
              : `Only ${applied} of ${updates.length} products moved, so the order is now partly wrong. Reload the list and try again.`,
        };
      }
      applied += 1;
    }

    revalidateStorefrontProducts();
    return { ok: true };
  } catch (error) {
    console.error("[admin-products] reorder failed", error);
    return { ok: false, error: toMessage(error, "Could not reorder products.") };
  }
}

/**
 * The smallest set of `sort_order` writes that swaps two list positions.
 *
 * Shared shape with `reorderCategory`, kept local to each feature because the
 * table name is baked into the query, not the arithmetic.
 */
function planReorder(
  rows: { id: string; sort_order: number }[],
  index: number,
  target: number,
): { id: string; sortOrder: number }[] {
  const moved = rows[index];
  const displaced = rows[target];

  if (moved.sort_order !== displaced.sort_order) {
    // Distinct numbers: exchanging them is the whole move.
    return [
      { id: moved.id, sortOrder: displaced.sort_order },
      { id: displaced.id, sortOrder: moved.sort_order },
    ];
  }

  // Tied. Numbers carry no information yet, so give the list one — this is the
  // only path that writes more than two rows, and it happens at most once.
  const ordered = [...rows];
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  return ordered
    .map((row, position) => ({ id: row.id, sortOrder: position, was: row.sort_order }))
    .filter((row) => row.sortOrder !== row.was)
    .map(({ id, sortOrder }) => ({ id, sortOrder }));
}

/**
 * Publish or unpublish a product without opening the form. Surfaced as the
 * toggle in each row of the product list.
 */
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
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      return { ok: false, error: notWrittenMessage("product") };
    }

    // Every product page carries a strip of the others, so publishing one
    // changes all of them.
    revalidateStorefrontProducts();
    return { ok: true };
  } catch (error) {
    console.error("[admin-products] status change failed", error);
    return { ok: false, error: toMessage(error, "Could not change the status.") };
  }
}
