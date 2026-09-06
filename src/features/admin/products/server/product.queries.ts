import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicUrl } from "@/lib/supabase/storage";
import type { IUploadedImage } from "@/features/admin/components/image-upload-field";
import type {
  ProductCategory,
  ProductStatus,
} from "@/features/admin/products/schemas/product.schema";
import type { IProductColor } from "@/features/catalog/types";

/**
 * Admin reads for `products`. Everything goes through the COOKIE-BOUND client
 * so RLS evaluates as the signed-in admin — the service-role client would
 * bypass exactly the checks that make this surface safe.
 *
 * Unlike the storefront's `productClient`, these include drafts.
 */

/** Per-product stock roll-up shown in the list. */
export interface IProductStockSummary {
  /** Variants with an explicit `inventory` row. Absent rows are "unknown". */
  tracked: number;
  outOfStock: number;
  units: number;
}

export interface IAdminProductListItem {
  id: string;
  slug: string;
  title: string;
  category: ProductCategory;
  price: number;
  currency: string;
  status: ProductStatus;
  comingSoon: boolean;
  sortOrder: number;
  /** First image by position, or null when the product has none. */
  image: { url: string; alt: string } | null;
  stock: IProductStockSummary;
}

export interface IAdminProduct {
  id: string;
  slug: string;
  title: string;
  category: ProductCategory;
  price: number;
  currency: string;
  blurb: string;
  materials: string;
  sizeLabel: string;
  sizes: string[];
  colors: IProductColor[];
  comingSoon: boolean;
  sortOrder: number;
  status: ProductStatus;
  images: IUploadedImage[];
}

/** A stock row whose colour/size the product no longer declares. */
export interface IInventoryOrphan {
  id: string;
  productId: string;
  slug: string;
  title: string;
  color: string;
  size: string;
  stock: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * `colors` is `jsonb`: the DB constrains its shape but the generated type is
 * `Json`, so it stays untrusted at the boundary. Same guard as the storefront.
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

/** Products for the admin table, ordered exactly as the storefront orders them. */
export async function listAdminProducts(): Promise<IAdminProductListItem[]> {
  const supabase = await createSupabaseServerClient();

  const [products, inventory] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, slug, title, category, price, currency, status, coming_soon, sort_order, product_images(storage_path, alt, position)",
      )
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
    // One flat read, grouped in memory: a handful of products means a join per
    // row would cost more than it saves.
    supabase.from("inventory").select("product_id, stock"),
  ]);

  if (products.error) {
    console.error("[admin-products] list failed", products.error);
    throw new Error("Could not load products.");
  }
  if (inventory.error) {
    console.error("[admin-products] inventory roll-up failed", inventory.error);
  }

  const stockByProduct = new Map<string, IProductStockSummary>();
  for (const row of inventory.data ?? []) {
    const summary = stockByProduct.get(row.product_id) ?? {
      tracked: 0,
      outOfStock: 0,
      units: 0,
    };
    summary.tracked += 1;
    summary.units += row.stock;
    if (row.stock <= 0) summary.outOfStock += 1;
    stockByProduct.set(row.product_id, summary);
  }

  return (products.data ?? []).map((row) => {
    const first = [...(row.product_images ?? [])].sort(
      (a, b) => a.position - b.position,
    )[0];
    const url = first ? publicUrl(first.storage_path) : null;

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category,
      price: row.price,
      currency: row.currency,
      status: row.status,
      comingSoon: row.coming_soon,
      sortOrder: row.sort_order,
      image: url
        ? { url, alt: first.alt.trim() || row.title }
        : null,
      stock: stockByProduct.get(row.id) ?? {
        tracked: 0,
        outOfStock: 0,
        units: 0,
      },
    };
  });
}

/** A single product with its ordered images, for the edit form. */
export async function getAdminProduct(id: string): Promise<IAdminProduct | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(storage_path, alt, width, height, position)")
    .eq("id", id)
    // No row is the expected "bad URL" case, which the page turns into a 404.
    .maybeSingle();

  if (error) {
    console.error("[admin-products] get failed", error);
    throw new Error("Could not load this product.");
  }
  if (!data) return null;

  const images: IUploadedImage[] = [...(data.product_images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((row) => ({
      url: publicUrl(row.storage_path) ?? "",
      path: row.storage_path,
      alt: row.alt,
      width: row.width,
      height: row.height,
    }))
    .filter((image) => image.url.length > 0);

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    category: data.category,
    price: data.price,
    currency: data.currency,
    blurb: data.blurb,
    materials: data.materials,
    sizeLabel: data.size_label,
    sizes: data.sizes ?? [],
    colors: toColors(data.colors),
    comingSoon: data.coming_soon,
    sortOrder: data.sort_order,
    status: data.status,
    images,
  };
}

/**
 * Stock rows stranded by a colour/size rename. The `inventory_options_exist`
 * trigger cannot catch these — it fires on `inventory`, and the write that
 * breaks them lands on `products`. This is the bug class that made the
 * Weekender Tote silently unbuyable, so the admin surfaces it explicitly.
 */
export async function listInventoryOrphans(
  productId?: string,
): Promise<IInventoryOrphan[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("inventory_orphans")
    .select("id, product_id, slug, title, color, size, stock");
  if (productId) query = query.eq("product_id", productId);

  const { data, error } = await query;

  if (error) {
    // A missing warning must never take down the page it warns on.
    console.error("[admin-products] orphan lookup failed", error);
    return [];
  }

  return (data ?? [])
    .filter((row) => row.id !== null && row.product_id !== null)
    .map((row) => ({
      id: row.id ?? "",
      productId: row.product_id ?? "",
      slug: row.slug ?? "",
      title: row.title ?? "",
      color: row.color ?? "",
      size: row.size ?? "",
      stock: row.stock ?? 0,
    }));
}
