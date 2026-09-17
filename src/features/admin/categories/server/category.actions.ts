"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/admin/server/auth";
import {
  firstIssue,
  notWrittenMessage,
  toActionMessage,
  type ActionResult,
} from "@/features/admin/server/action-result";
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
 * `/` and nothing else. `revalidateStorefrontProducts()` is deliberately not
 * used: it would blow away `/products` and every PDP for a change that cannot
 * affect them. `revalidatePath("/")` is a literal path, so it needs no `type`.
 */

/**
 * No constraint map: `shop_categories` has no NAMED constraints (see
 * `0003_content.sql`), so there is nothing table-specific to translate — the
 * generic codes in `action-result.ts` say everything true about a failure here.
 */
function toMessage(error: unknown, fallback: string): string {
  return toActionMessage(error, fallback);
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

/**
 * Drop a storage object nothing points at any more. Best effort: the row is
 * already correct, so a failure costs bytes, not a broken tile.
 *
 * ⚠️ Bytes are deleted HERE, after the row is committed — never from the
 * browser when the operator clicks the X, which destroyed the object of a live
 * tile the moment they changed their mind and hit Cancel. The cost is that an
 * upload for a category that is never saved leaks its object; that is accepted
 * deliberately, and the answer is a periodic sweep of `media`, not more code
 * on this path.
 */
async function removeStorageObject(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  path: string | null,
) {
  if (!path) return;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) console.error("[admin-categories] storage cleanup failed", error);
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

    // The path this tile points at BEFORE the write, so a replaced or cleared
    // upload can have its bytes removed afterwards.
    const { data: existing, error: readError } = await supabase
      .from("shop_categories")
      .select("image_path")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw readError;

    // `.select()` is not decoration: PostgREST reports no error when a write
    // matches nothing, and an RLS-denied write IS a zero-row write.
    const { data, error } = await supabase
      .from("shop_categories")
      .update(row)
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      return { ok: false, error: notWrittenMessage("category") };
    }

    const previous = existing?.image_path ?? null;
    if (previous && previous !== row.image_path) {
      await removeStorageObject(supabase, previous);
    }

    revalidatePath("/");
    return { ok: true, id: data[0].id };
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

    const { data, error } = await supabase
      .from("shop_categories")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      return { ok: false, error: notWrittenMessage("category") };
    }

    await removeStorageObject(supabase, existing.image_path);

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
 * ⚠️ No transaction — see the long note on `reorderProduct`, which this
 * mirrors: the smallest possible write set, and a partial failure reported as
 * partial rather than as a plain error.
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

    const updates = planReorder(rows, index, target);

    let applied = 0;
    for (const update of updates) {
      const { data: written, error: updateError } = await supabase
        .from("shop_categories")
        .update({ sort_order: update.sortOrder })
        .eq("id", update.id)
        .select("id");
      if (updateError || !written || written.length === 0) {
        if (updateError) {
          console.error("[admin-categories] reorder write failed", updateError);
        }
        revalidatePath("/");
        return {
          ok: false,
          error:
            applied === 0
              ? notWrittenMessage("category")
              : `Only ${applied} of ${updates.length} categories moved, so the order is now partly wrong. Reload the list and try again.`,
        };
      }
      applied += 1;
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
 * The smallest set of `sort_order` writes that swaps two list positions.
 *
 * Two rows are enough whenever the pair's numbers differ. They do not differ
 * the first time — every row ships `sort_order = 0` and ties break on label —
 * so that one case renumbers the list, after which every row has a distinct
 * number and later reorders are two writes again.
 */
function planReorder(
  rows: { id: string; sort_order: number }[],
  index: number,
  target: number,
): { id: string; sortOrder: number }[] {
  const moved = rows[index];
  const displaced = rows[target];

  if (moved.sort_order !== displaced.sort_order) {
    return [
      { id: moved.id, sortOrder: displaced.sort_order },
      { id: displaced.id, sortOrder: moved.sort_order },
    ];
  }

  const ordered = [...rows];
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  return ordered
    .map((row, position) => ({ id: row.id, sortOrder: position, was: row.sort_order }))
    .filter((row) => row.sortOrder !== row.was)
    .map(({ id, sortOrder }) => ({ id, sortOrder }));
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
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      return { ok: false, error: notWrittenMessage("category") };
    }

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
