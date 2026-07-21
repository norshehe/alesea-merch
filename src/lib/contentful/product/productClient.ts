import { contentful } from "@/lib/contentful";
import type {
  IProductColorField,
  ProductSkeleton,
} from "@/lib/contentful/types/product/response";
import type {
  CatalogCategory,
  ICatalogImage,
  ICatalogProduct,
  IProductColor,
} from "@/features/catalog/types";
import type { Asset, Entry } from "contentful";

/**
 * Raw Contentful calls for the `product` content type, normalized to the
 * storefront's `ICatalogProduct` shape so the UI is data-source agnostic.
 * Never leak raw Contentful entries to the UI.
 */

const VALID_CATEGORIES: CatalogCategory[] = ["tees", "bags", "caps", "tumblers"];

function toCategory(value: string): CatalogCategory {
  if ((VALID_CATEGORIES as string[]).includes(value)) {
    return value as CatalogCategory;
  }
  // Surface content-model drift instead of silently bucketing into "tees".
  console.warn(
    `[product] Unknown category "${value}" — defaulting to "tees". Reconcile the Contentful model with CatalogCategory.`,
  );
  return "tees";
}

function toColors(raw: IProductColorField[] | undefined): IProductColor[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (c): c is IProductColorField =>
        typeof c?.name === "string" && typeof c?.hex === "string",
    )
    .map((c) => ({ name: c.name, hex: c.hex }));
}

function toSizes(raw: string[] | undefined): string[] {
  return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : [];
}

function toImages(
  assets: (Asset<undefined, string> | undefined)[] | undefined,
  fallbackAlt: string,
): ICatalogImage[] {
  if (!Array.isArray(assets)) return [];
  return assets
    .map((asset) => {
      const file = asset?.fields?.file;
      if (!file?.url) return null;
      const url = String(file.url);
      const details = file.details as
        | { image?: { width: number; height: number } }
        | undefined;
      const image: ICatalogImage = {
        url: url.startsWith("//") ? `https:${url}` : url,
        alt: (asset?.fields?.title as string | undefined) ?? fallbackAlt,
        width: details?.image?.width ?? 0,
        height: details?.image?.height ?? 0,
      };
      return image;
    })
    .filter((i): i is ICatalogImage => i !== null);
}

function normalize(
  entry: Entry<ProductSkeleton, undefined, string>,
): ICatalogProduct {
  const f = entry.fields;
  return {
    id: entry.sys.id,
    slug: f.slug,
    name: f.title,
    category: toCategory(f.category),
    price: typeof f.price === "number" ? f.price : 0,
    currency: f.currency ?? "PHP",
    blurb: f.blurb ?? "",
    materials: f.materials ?? "",
    colors: toColors(f.colors),
    sizes: toSizes(f.sizes),
    sizeLabel: f.sizeLabel ?? "Size",
    comingSoon: f.comingSoon === true,
    images: toImages(
      f.images as (Asset<undefined, string> | undefined)[] | undefined,
      f.title,
    ),
  };
}

export async function getProductsFromContentful(): Promise<ICatalogProduct[]> {
  // Primary sort by the `order` field, then title — both applied server-side
  // by Contentful so the returned order is authoritative.
  const res = await contentful.getEntries<ProductSkeleton>({
    content_type: "product",
    order: ["fields.order", "fields.title"],
    limit: 100,
    include: 1,
  });
  return res.items.map(normalize);
}

export async function getProductBySlugFromContentful(
  slug: string,
): Promise<ICatalogProduct | null> {
  const res = await contentful.getEntries<ProductSkeleton>({
    content_type: "product",
    "fields.slug": slug,
    limit: 1,
    include: 1,
  });
  const entry = res.items[0];
  return entry ? normalize(entry) : null;
}
