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
 * phantom products, which is worse than an empty grid; and ISR already keeps
 * serving the last good render when a revalidation fetch fails. Resilience
 * belongs in the caching layer, not in duplicated product data.
 */

/** All published products, ordered by `sort_order` then title. */
export async function getCatalog(): Promise<ICatalogProduct[]> {
  try {
    return await getProductsFromSupabase();
  } catch (error) {
    console.error("[catalog] Supabase product fetch failed.", error);
    return [];
  }
}

/** A single published product by slug — `undefined` lets callers `notFound()`. */
export async function getProduct(
  slug: string,
): Promise<ICatalogProduct | undefined> {
  try {
    const product = await getProductBySlugFromSupabase(slug);
    return product ?? undefined;
  } catch (error) {
    console.error(
      `[catalog] Supabase fetch failed for slug "${slug}".`,
      error,
    );
    return undefined;
  }
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
