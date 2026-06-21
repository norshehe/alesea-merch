import { contentful } from "@/lib/contentful";
import type {
  HomePageSkeleton,
  IAssuranceField,
} from "@/lib/contentful/types/home/response";
import type {
  IShopCategory,
  ShopCategoryFilterKey,
  ShopCategorySkeleton,
} from "@/lib/contentful/types/shopCategory/response";
import type { Asset, Entry } from "contentful";

/** Assurance card, normalized. */
export interface IAssurance {
  title: string;
  body: string;
}

/**
 * Normalized homepage content. Every textual field is a plain string; image
 * fields are URLs or null (callers apply fallbacks). Linked categories and
 * assurances are fully resolved.
 */
export interface IHomeContent {
  heroEyebrow: string;
  heroHeading: string;
  heroBody: string;
  heroImage: string | null;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  categoryEyebrow: string;
  categoryHeading: string;
  categoryBody: string;
  categories: IShopCategory[];
  assurances: IAssurance[];
  editorialEyebrow: string;
  editorialHeading: string;
  editorialBody: string;
  editorialQuote: string;
  editorialImage: string | null;
  editorialCta: string;
  carryEyebrow: string;
  carryHeading: string;
  carryBody: string;
  carryImage: string | null;
  carryCta: string;
  shorelineHandle: string;
  shorelineHeading: string;
  shorelineBody: string;
}

function assetUrl(asset: Asset<undefined, string> | undefined): string | null {
  const url = asset?.fields?.file?.url;
  if (!url) return null;
  const str = String(url);
  return str.startsWith("//") ? `https:${str}` : str;
}

function toCategories(
  raw:
    | (Entry<ShopCategorySkeleton, undefined, string> | undefined)[]
    | undefined,
): IShopCategory[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (e): e is Entry<ShopCategorySkeleton, undefined, string> =>
        Boolean(e?.fields),
    )
    .map((entry) => {
      const f = entry.fields;
      return {
        id: entry.sys.id,
        label: f.label ?? "",
        eyebrow: f.eyebrow ?? "Collection",
        filterKey: (f.filterKey ?? "all") as ShopCategoryFilterKey,
        image: assetUrl(f.image as Asset<undefined, string> | undefined),
      };
    });
}

function toAssurances(raw: IAssuranceField[] | undefined): IAssurance[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (a): a is IAssuranceField =>
        typeof a?.title === "string" && typeof a?.body === "string",
    )
    .map((a) => ({ title: a.title, body: a.body }));
}

/**
 * Fetch the single `homePage` entry, normalized with linked categories
 * resolved. Returns null when missing so callers apply per-field fallbacks.
 */
export async function getHomeContentFromContentful(): Promise<IHomeContent | null> {
  const res = await contentful.getEntries<HomePageSkeleton>({
    content_type: "homePage",
    limit: 1,
    include: 2,
  });
  const entry = res.items[0];
  if (!entry) return null;
  const f = entry.fields;

  return {
    heroEyebrow: f.heroEyebrow ?? "",
    heroHeading: f.heroHeading ?? "",
    heroBody: f.heroBody ?? "",
    heroImage: assetUrl(f.heroImage as Asset<undefined, string> | undefined),
    heroPrimaryCta: f.heroPrimaryCta ?? "",
    heroSecondaryCta: f.heroSecondaryCta ?? "",
    categoryEyebrow: f.categoryEyebrow ?? "",
    categoryHeading: f.categoryHeading ?? "",
    categoryBody: f.categoryBody ?? "",
    categories: toCategories(
      f.categories as
        | (Entry<ShopCategorySkeleton, undefined, string> | undefined)[]
        | undefined,
    ),
    assurances: toAssurances(f.assurances),
    editorialEyebrow: f.editorialEyebrow ?? "",
    editorialHeading: f.editorialHeading ?? "",
    editorialBody: f.editorialBody ?? "",
    editorialQuote: f.editorialQuote ?? "",
    editorialImage: assetUrl(
      f.editorialImage as Asset<undefined, string> | undefined,
    ),
    editorialCta: f.editorialCta ?? "",
    carryEyebrow: f.carryEyebrow ?? "",
    carryHeading: f.carryHeading ?? "",
    carryBody: f.carryBody ?? "",
    carryImage: assetUrl(f.carryImage as Asset<undefined, string> | undefined),
    carryCta: f.carryCta ?? "",
    shorelineHandle: f.shorelineHandle ?? "",
    shorelineHeading: f.shorelineHeading ?? "",
    shorelineBody: f.shorelineBody ?? "",
  };
}
