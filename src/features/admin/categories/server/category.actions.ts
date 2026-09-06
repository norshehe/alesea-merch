"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/admin/server/auth";
import {
  categorySchema,
  type CategoryFormValues,
  type CategoryValues,
} from "@/features/admin/categories/schemas/category.schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MEDIA_BUCKET } from "@/lib/supabase/storage";

/**
 * Write path for `shop_categories`. Every export starts with `requireAdmin()` —
 * RLS is the real gate, but an unauthenticated caller should get a redirect,
 * not a confusing permission error from Postgres.
 *
 * Every action re-parses its input server-side: the client schema is a UX
 * affordance, not a security boundary.
 *
 * Categories are rendered ONLY by the home page, so every mutation revalidates
 * `/` and nothing else. `revalidateProduct*` from
 * `@/features/admin/server/revalidate` is deliberately not used: it would blow
 * away `/products` and every PDP for a change that cannot affect them.
 * `revalidatePath("/")` is a literal path, so it needs no `type` argument.
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
 * Translate a database error into something an operator can act on. The raw
 * error is logged, never returned — it carries SQL and column names.
 */
function toMessage(error: unknown, fallback: string): string {
  if (!isPostgresError(error)) return fallback;

  // 22P02: a malformed uuid or an enum value the database does not know.
  if (error.code === "22P02") return "That category no longer exists.";
  if (error.code === "23514" || error.code === "23502") {
    return "That change breaks a database rule on this category.";
  }

  return fallback;
}

/** Zod issue → the sentence the operator sees. */
function firstIssue(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Some fields need attention.";
}

/**
 * Form values → row.
 *
 * `image_path` and `image_url` are a PAIR, resolved as `path ? publicUrl(path)
 * : url`. Both are written every time so the pair always tells the truth:
 * removing the upload must clear `image_path`, or the external URL underneath
 * it would stay invisible forever.
 */
function toRow(values: CategoryValues) {
  return {
    label: values.label,
    // NOT NULL with a default, so an empty box means "use the default" rather
    // than writing a blank eyebrow onto the tile.
    eyebrow: values.eyebrow || "Collection",
    filter_key: values.filterKey,
    image_path: values.image[0]?.path ?? null,
    image_url: values.imageUrl || null,
    sort_order: values.sortOrder,
    is_active: values.isActive,
  };
}

/** Create (`id === null`) or update one category tile. */
export async function saveCategory(
  id: string | null,
  values: CategoryFormValues,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: firstIssue(parsed.error.issues) };
  }

  const supabase = await createSupabaseServerClient();
  const row = toRow(parsed.data);

  try {
    if (id === null) {
      const { data, error } = await supabase
        .from("shop_categories")
        .insert(row)
        .select("id")
        .single();
      if (error) throw error;

      revalidatePath("/");
      return { ok: true, id: data.id };
    }

    const { data, error } = await supabase
      .from("shop_categories")
      .update(row)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, error: "That category no longer exists." };

    revalidatePath("/");
    return { ok: true, id: data.id };
  } catch (error) {
    console.error("[admin-categories] save failed", error);
    return {
      ok: false,
      error: toMessage(error, "Could not save this category."),
    };
  }
}

/**
 * Delete a category AND its uploaded Storage object.
 *
 * The object must go too: nothing else ever references it again, and the bucket
 * would otherwise grow forever. The path is read first, because the delete
 * destroys the only record of it. Mirrors `deleteProduct`.
 */
export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();

  try {
    const { data: existing, error: readError } = await supabase
      .from("shop_categories")
      .select("image_path")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw readError;
    if (!existing) return { ok: false, error: "That category no longer exists." };

    const { error } = await supabase
      .from("shop_categories")
      .delete()
      .eq("id", id);
    if (error) throw error;

    if (existing.image_path) {
      const { error: storageError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .remove([existing.image_path]);
      // Best effort: the category is already gone. Orphaned bytes are a cleanup
      // chore, not a failure worth showing the operator.
      if (storageError) {
        console.error("[admin-categories] storage cleanup failed", storageError);
      }
    }

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("[admin-categories] delete failed", error);
    return {
      ok: false,
      error: toMessage(error, "Could not delete this category."),
    };
  }
}

/**
 * Move a category one place up or down on the home page.
 *
 * The whole list is renumbered from its current order rather than swapping two
 * `sort_order` values: every row ships with `sort_order = 0` by default, and
 * swapping two zeroes changes nothing at all. Only rows whose number actually
 * changes are written. Same approach as `reorderProduct`.
 */
export async function reorderCategory(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();

  try {
    // The same ordering the list and the home page use, so "up" means what the
    // operator just saw on screen.
    const { data, error } = await supabase
      .from("shop_categories")
      .select("id, sort_order")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    if (error) throw error;

    const rows = data ?? [];
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) return { ok: false, error: "That category no longer exists." };

    const target = direction === "up" ? index - 1 : index + 1;
    // Already at the end — a no-op, not an error.
    if (target < 0 || target >= rows.length) return { ok: true };

    const ordered = [...rows];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

    const updates = ordered
      .map((row, position) => ({ id: row.id, position, previous: row.sort_order }))
      .filter((row) => row.position !== row.previous);

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("shop_categories")
        .update({ sort_order: update.position })
        .eq("id", update.id);
      if (updateError) throw updateError;
    }

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("[admin-categories] reorder failed", error);
    return {
      ok: false,
      error: toMessage(error, "Could not reorder categories."),
    };
  }
}

/**
 * Show or hide a tile without opening the form. Inactive rows stay in the admin
 * list (RLS lets an admin read them) and vanish from the home page.
 */
export async function setCategoryActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();

  try {
    const { data, error } = await supabase
      .from("shop_categories")
      .update({ is_active: active })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, error: "That category no longer exists." };

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("[admin-categories] visibility change failed", error);
    return {
      ok: false,
      error: toMessage(error, "Could not change the visibility."),
    };
  }
}
