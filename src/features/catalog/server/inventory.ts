import "server-only";
import { supabasePublic } from "@/lib/supabase/public";
import { variantKey } from "@/features/catalog/lib/stock";

/**
 * Server-only Supabase inventory reads.
 *
 * Inventory is display + enforcement only (stock is decremented by the order
 * RPC, not here). It is keyed by `slug|Color|Size` and read from the
 * `inventory_by_slug` view, which joins `inventory` to its product's slug.
 * The table is SPARSE: a missing row means UNKNOWN stock, not zero.
 */

/** A single per-variant stock row, normalized. */
export interface IVariantStock {
  slug: string;
  color: string;
  size: string;
  stock: number;
}

/**
 * Fetch all inventory rows and return a Map keyed by `slug|color|size` → stock.
 *
 * Graceful fallback: when the query errors or throws, this warns and returns an
 * EMPTY map. Callers MUST treat a missing key as in stock — only an explicit `0`
 * means out of stock. This guarantees the store never blocks sales when Supabase
 * is down or a variant row is simply absent.
 */
export async function getInventory(): Promise<Map<string, number>> {
  const inventory = new Map<string, number>();

  try {
    const { data, error } = await supabasePublic
      .from("inventory_by_slug")
      .select("slug, color, size, stock");

    if (error) throw error;

    for (const row of data ?? []) {
      if (!row.slug || typeof row.stock !== "number") continue;
      // Blank color/size are valid: a product with no variants (or only one
      // axis) is keyed with empty strings, mirroring how lookups fall back.
      inventory.set(
        variantKey(row.slug, row.color ?? "", row.size ?? ""),
        row.stock,
      );
    }
  } catch (error) {
    console.warn(
      "[inventory] unavailable — treating all variants as in stock",
      error,
    );
    return new Map<string, number>();
  }

  return inventory;
}
