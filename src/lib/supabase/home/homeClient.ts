import { getSupabasePublic } from "@/lib/supabase/public";
import { resolveImageUrl } from "@/lib/supabase/storage";
import type {
  IShopCategory,
  ShopCategoryFilterKey,
} from "@/lib/supabase/types/shopCategory/response";
import type { Database } from "@/lib/supabase/types";

/** Assurance card, normalized. */
export interface IAssurance {
  title: string;
  body: string;
}

/**
 * Normalized homepage content. Every textual field is a plain string; image
 * fields are URLs or null (callers apply fallbacks). Shop categories and
 * assurances are fully resolved.
 */
export interface IHomeContent {
  heroEyebrow: string;
  heroHeading: string;
  heroBody: string;
  heroImage: string | null;
  heroPrimaryCta: string;
  categoryEyebrow: string;
  categoryHeading: string;
  categoryBody: string;
  categories: IShopCategory[];
  assurances: IAssurance[];
  editorialEyebrow: string;
  editorialHeading: string;
  editorialImage: string | null;
  editorialCta: string;
  carryEyebrow: string;
  carryHeading: string;
  carryBody: string;
  carryImage: string | null;
  shorelineHandle: string;
  shorelineHeading: string;
  shorelineBody: string;
}

type ShopCategoryRow = Database["public"]["Tables"]["shop_categories"]["Row"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `assurances` is a `jsonb` column — untrusted at the type level. */
function toAssurances(raw: unknown): IAssurance[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (a: unknown): a is { title: string; body: string } =>
        isRecord(a) && typeof a.title === "string" && typeof a.body === "string",
    )
    .map((a) => ({ title: a.title, body: a.body }));
}

function toCategories(rows: ShopCategoryRow[]): IShopCategory[] {
  return rows.map((row) => ({
    id: row.id,
    label: row.label ?? "",
    eyebrow: row.eyebrow.trim().length > 0 ? row.eyebrow : "Collection",
    // `filter_key` is a Postgres enum matching ShopCategoryFilterKey, so no
    // runtime coercion is needed — an invalid key is unrepresentable.
    filterKey: row.filter_key satisfies ShopCategoryFilterKey,
    image: resolveImageUrl(row.image_path, row.image_url),
  }));
}

/**
 * Fetch the singleton `home_content` row plus the active shop categories.
 * Returns null when the row is missing so callers apply per-field fallbacks.
 */
export async function getHomeContentFromSupabase(): Promise<IHomeContent | null> {
  const supabase = getSupabasePublic();

  // Two independent tables — issue both requests at once.
  const [homeResult, categoryResult] = await Promise.all([
    supabase.from("home_content").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("shop_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("label"),
  ]);

  if (homeResult.error) throw homeResult.error;
  if (categoryResult.error) throw categoryResult.error;

  const data = homeResult.data;
  if (!data) return null;

  return {
    heroEyebrow: data.hero_eyebrow ?? "",
    heroHeading: data.hero_heading ?? "",
    heroBody: data.hero_body ?? "",
    heroImage: resolveImageUrl(data.hero_image_path, data.hero_image_url),
    heroPrimaryCta: data.hero_primary_cta ?? "",
    categoryEyebrow: data.category_eyebrow ?? "",
    categoryHeading: data.category_heading ?? "",
    categoryBody: data.category_body ?? "",
    categories: toCategories(categoryResult.data ?? []),
    assurances: toAssurances(data.assurances),
    editorialEyebrow: data.editorial_eyebrow ?? "",
    editorialHeading: data.editorial_heading ?? "",
    editorialImage: resolveImageUrl(
      data.editorial_image_path,
      data.editorial_image_url,
    ),
    editorialCta: data.editorial_cta ?? "",
    carryEyebrow: data.carry_eyebrow ?? "",
    carryHeading: data.carry_heading ?? "",
    carryBody: data.carry_body ?? "",
    carryImage: resolveImageUrl(data.carry_image_path, data.carry_image_url),
    shorelineHandle: data.shoreline_handle ?? "",
    shorelineHeading: data.shoreline_heading ?? "",
    shorelineBody: data.shoreline_body ?? "",
  };
}
