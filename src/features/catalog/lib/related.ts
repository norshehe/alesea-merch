import type { ICatalogProduct } from "@/features/catalog/types";

/**
 * Related products for "Complete the set". With the trimmed catalog the useful
 * pairing for a tee is the other tee plus the Tote, so we simply surface every
 * other product in the pool (order preserved). Kept generic so it still works
 * if the catalog grows.
 */
export function getRelatedProducts(
  product: ICatalogProduct,
  limit = 4,
  pool: ICatalogProduct[] = [],
): ICatalogProduct[] {
  return pool.filter((p) => p.id !== product.id).slice(0, limit);
}
