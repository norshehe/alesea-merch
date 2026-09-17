import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicUrl, resolveImageUrl } from "@/lib/supabase/storage";
import type { IUploadedImage } from "@/features/admin/components/image-upload-field";
import type { CategoryFilterKey } from "@/features/admin/categories/schemas/category.schema";

/**
 * Admin reads for `shop_categories` — the home page's category tiles.
 *
 * Everything goes through the COOKIE-BOUND client so RLS evaluates as the
 * signed-in admin. That is what makes the INACTIVE rows visible here: the anon
 * policy is `using (is_active)`, so the storefront can only ever see live
 * tiles, while the admin sees the whole list.
 */

/** A UUID, so a hand-typed URL becomes a 404 rather than a Postgres 22P02. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface IAdminCategory {
  id: string;
  label: string;
  eyebrow: string;
  filterKey: CategoryFilterKey;
  /** The uploaded object, if there is one. Wins over `imageUrl` when set. */
  image: IUploadedImage | null;
  /** The external-URL half of the pair. Used only when nothing is uploaded. */
  imageUrl: string;
  /** What the tile will actually render — the `path ? publicUrl : url` rule. */
  resolvedImage: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** Never returns — the call site reads better as an expression. */
function requireStorageUrl(path: string): never {
  console.error("[admin-categories] no public URL for image", path);
  throw new Error(
    "Storage is not configured, so this category's image cannot be edited safely.",
  );
}

function toCategory(row: {
  id: string;
  label: string;
  eyebrow: string;
  filter_key: CategoryFilterKey;
  image_path: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}): IAdminCategory {
  const uploadedUrl = publicUrl(row.image_path);

  return {
    id: row.id,
    label: row.label,
    eyebrow: row.eyebrow,
    filterKey: row.filter_key,
    // ⚠️ Never report an existing `image_path` as "no upload". This value
    // round-trips: the form posts back what it was given and `toRow` writes
    // `image_path: values.image[0]?.path ?? null`, so a dropped row would clear
    // the column on the next save and strand its bytes. `publicUrl` returns
    // null only when the Storage host is unconfigured — an environment fault,
    // surfaced as one rather than swallowed.
    image: row.image_path
      ? {
          url: uploadedUrl ?? requireStorageUrl(row.image_path),
          path: row.image_path,
          // `shop_categories` has no alt column; the label is the accessible
          // name of the tile on the storefront.
          alt: row.label,
          width: 0,
          height: 0,
        }
      : null,
    imageUrl: row.image_url ?? "",
    resolvedImage: resolveImageUrl(row.image_path, row.image_url),
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

/**
 * Every category, including inactive ones, in the order the home page uses.
 * `label` breaks ties so the list is stable — every row ships `sort_order = 0`
 * by default, and an unstable order would make the reorder buttons lie.
 */
export async function listAdminCategories(): Promise<IAdminCategory[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("shop_categories")
    .select(
      "id, label, eyebrow, filter_key, image_path, image_url, sort_order, is_active",
    )
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    console.error("[admin-categories] list failed", error);
    throw new Error("Could not load categories.");
  }

  return (data ?? []).map(toCategory);
}

/** A single category for the edit form. Null is the expected "bad URL" case. */
export async function getAdminCategory(
  id: string,
): Promise<IAdminCategory | null> {
  if (!UUID_PATTERN.test(id)) return null;

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("shop_categories")
    .select(
      "id, label, eyebrow, filter_key, image_path, image_url, sort_order, is_active",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin-categories] get failed", error);
    throw new Error("Could not load this category.");
  }
  if (!data) return null;

  return toCategory(data);
}
