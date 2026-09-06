import "server-only";
import {
  getProductBySlugFromSupabase,
  getProductsFromSupabase,
} from "@/lib/supabase/product/productClient";
import { getRelatedProducts as getRelatedFromList } from "@/features/catalog/lib/related";
import type { ICatalogProduct } from "@/features/catalog/types";

/**
 * Catalog data access for Server Components.
 *
 * Supabase is the ONLY source of truth — there is deliberately no hardcoded
 * fallback catalog. A stale in-code catalog would serve wrong prices and
 * phantom products, which is worse than no render at all.
 *
 * FETCH ERRORS MUST THROW. ISR only keeps serving the last good render when a
 * revalidation *throws*; a swallowed error that returns `[]` / `undefined` is a
 * successful render of an empty grid — or a `notFound()` — and that gets
 * written into the ISR cache and served to everyone for the next `revalidate`
 * window. A transient network blip would become a cached 404. Throwing instead
 * fires the segment's `error.tsx` on a cold render and leaves the previous
 * cache entry intact on a background revalidation.
 *
 * `undefined` from {@link getProduct} therefore means exactly one thing: the
 * query succeeded and matched no row. That, and only that, warrants
 * `notFound()`.
 */

/**
 * All published products, ordered by `sort_order` then title.
 * Throws when the query fails — never returns `[]` to mask an error.
 */
export async function getCatalog(): Promise<ICatalogProduct[]> {
  return getProductsFromSupabase();
}

/**
 * A single published product by slug.
 * `undefined` means "no such row" (a successful query with zero rows), which
 * lets callers `notFound()`. Query failures throw.
 */
export async function getProduct(
  slug: string,
): Promise<ICatalogProduct | undefined> {
  return (await getProductBySlugFromSupabase(slug)) ?? undefined;
}

/**
 * Related products for a given product, drawn from the same source list.
 * Pass the already-fetched catalog so we don't refetch or mix sources.
 */
export function getRelated(
  product: ICatalogProduct,
  catalog: ICatalogProduct[],
  limit = 4,
): ICatalogProduct[] {
  return getRelatedFromList(product, limit, catalog);
}
