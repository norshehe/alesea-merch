import { supabasePublic } from "@/lib/supabase/public";
import { publicUrl } from "@/lib/supabase/storage";
import type { Database } from "@/lib/supabase/types";
import type {
  ICatalogImage,
  ICatalogProduct,
  IProductColor,
} from "@/features/catalog/types";

/**
 * Raw Supabase reads for `products`, normalized to the storefront's
 * `ICatalogProduct` shape so the UI stays data-source agnostic.
 * Never leak raw Postgrest rows to the UI.
 */

type ProductRow = Database["public"]["Tables"]["products"]["Row"];

type ProductImageRow = Pick<
  Database["public"]["Tables"]["product_images"]["Row"],
  "storage_path" | "alt" | "width" | "height" | "position"
>;

interface IProductRowWithImages extends ProductRow {
  product_images: ProductImageRow[];
}

/** Products plus their images in one round trip — no N+1 per card. */
const PRODUCT_SELECT =
  "*, product_images(storage_path, alt, width, height, position)";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * `colors` is a `jsonb` column: the DB constraint checks its shape, but the
 * generated type is `Json`, so it stays untrusted here. Filter defensively.
 */
function toColors(raw: unknown): IProductColor[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (c: unknown): c is { name: string; hex: string } =>
        isRecord(c) && typeof c.name === "string" && typeof c.hex === "string",
    )
    .map((c) => ({ name: c.name, hex: c.hex }));
}

function toSizes(raw: string[] | null): string[] {
  return Array.isArray(raw)
    ? raw.filter((s): s is string => typeof s === "string")
    : [];
}

function toImages(
  rows: ProductImageRow[] | null,
  fallbackAlt: string,
): ICatalogImage[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const url = publicUrl(row.storage_path);
      if (!url) return null;
      const image: ICatalogImage = {
        // `alt` is NOT NULL with a '' default, so an empty string means
        // "unset" — fall back to the product title, as Contentful did.
        alt: row.alt.trim().length > 0 ? row.alt : fallbackAlt,
        url,
        width: row.width ?? 0,
        height: row.height ?? 0,
      };
      return image;
    })
    .filter((i): i is ICatalogImage => i !== null);
}

/**
 * No `toCategory()` drift coercion here: `products.category` is a Postgres enum
 * matching `CatalogCategory` exactly, so an invalid category is unrepresentable
 * in the database and needs no runtime guard.
 */
function normalize(row: IProductRowWithImages): ICatalogProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.title,
    category: row.category,
    price: typeof row.price === "number" ? row.price : 0,
    currency: row.currency ?? "PHP",
    blurb: row.blurb ?? "",
    materials: row.materials ?? "",
    colors: toColors(row.colors),
    sizes: toSizes(row.sizes),
    sizeLabel: row.size_label ?? "Size",
    comingSoon: row.coming_soon === true,
    images: toImages(row.product_images, row.title),
  };
}

export async function getProductsFromSupabase(): Promise<ICatalogProduct[]> {
  // `sort_order` then `title` reproduces Contentful's
  // `order: ["fields.order", "fields.title"]`, so grid order is unchanged.
  // Images are ordered by `position` inside the embedded relation.
  const { data, error } = await supabasePublic
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "published")
    .order("sort_order")
    .order("title")
    .order("position", { referencedTable: "product_images" });

  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function getProductBySlugFromSupabase(
  slug: string,
): Promise<ICatalogProduct | null> {
  const { data, error } = await supabasePublic
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "published")
    .eq("slug", slug)
    .order("position", { referencedTable: "product_images" })
    .maybeSingle();

  if (error) throw error;
  return data ? normalize(data) : null;
}
