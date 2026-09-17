import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProductStatus } from "@/features/admin/products/schemas/product.schema";
import type { IProductColor } from "@/features/catalog/types";

/**
 * Admin reads for `inventory`. Cookie-bound client only, so RLS evaluates as
 * the signed-in admin — the service-role client would bypass exactly the checks
 * that make this surface safe.
 *
 * Orphan lookup is NOT duplicated here: `listInventoryOrphans()` already lives
 * in the products feature and takes an optional productId. Import it from
 * `@/features/admin/products/server/product.queries`.
 */

/** A product as the inventory grid needs it: identity plus its two axes. */
export interface IInventoryProduct {
  id: string;
  slug: string;
  title: string;
  status: ProductStatus;
  colors: IProductColor[];
  sizes: string[];
}

/** One existing stock row. Absent rows are "unknown", never zero. */
export interface IInventoryRow {
  /** `''` when the product has no colour axis. */
  color: string;
  /** `''` when the product has no size axis. */
  size: string;
  stock: number;
  sku: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * `colors` is `jsonb`: the DB constrains its shape but the generated type is
 * `Json`, so it stays untrusted at the boundary. Same guard as the storefront
 * and the admin product list.
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

/**
 * Every product — drafts included — in the same order as the admin product
 * list, so the picker matches the table the operator just came from.
 *
 * Drafts are in scope on purpose: stock is usually entered before publishing.
 */
export async function listProductsForInventory(): Promise<IInventoryProduct[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, slug, title, status, colors, sizes")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    console.error("[admin-inventory] product list failed", error);
    throw new Error("Could not load products.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    colors: toColors(row.colors),
    sizes: row.sizes ?? [],
  }));
}

/**
 * The stock rows that exist for one product.
 *
 * Sparse by design — a variant with no row here is UNKNOWN, which the
 * storefront reads as in stock and the back-in-stock job reads as
 * do-not-email. Never backfill the missing combinations.
 */
export async function getInventoryForProduct(
  productId: string,
): Promise<IInventoryRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("inventory")
    .select("color, size, stock, sku")
    .eq("product_id", productId);

  if (error) {
    console.error("[admin-inventory] rows failed", error);
    throw new Error("Could not load stock for this product.");
  }

  return (data ?? []).map((row) => ({
    color: row.color,
    size: row.size,
    stock: row.stock,
    sku: row.sku,
  }));
}
