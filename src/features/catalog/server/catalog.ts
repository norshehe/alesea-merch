import "server-only";
import {
  getProductBySlugFromContentful,
  getProductsFromContentful,
} from "@/lib/contentful/product/productClient";
import {
  PRODUCTS,
  getRelatedProducts as getRelatedFromList,
} from "@/features/catalog/constants/products";
import type { ICatalogProduct } from "@/features/catalog/types";

/**
 * Catalog data access for Server Components.
 *
 * Contentful is the source of truth; the local `PRODUCTS` catalog is the
 * offline / empty fallback. If Contentful throws OR returns nothing, the site
 * renders identically to the local catalog (a `console.warn` flags the fallback).
 */

/** All products — Contentful first, local catalog as fallback. */
export async function getCatalog(): Promise<ICatalogProduct[]> {
  try {
    const products = await getProductsFromContentful();
    if (products.length > 0) return products;
    console.warn(
      "[catalog] Contentful returned no products — falling back to local catalog.",
    );
  } catch (error) {
    console.warn(
      "[catalog] Contentful product fetch failed — falling back to local catalog.",
      error,
    );
  }
  return PRODUCTS;
}

/** A single product by slug — Contentful first, local catalog as fallback. */
export async function getProduct(
  slug: string,
): Promise<ICatalogProduct | undefined> {
  try {
    const product = await getProductBySlugFromContentful(slug);
    if (product) return product;
  } catch (error) {
    console.warn(
      `[catalog] Contentful fetch failed for slug "${slug}" — falling back to local catalog.`,
      error,
    );
  }
  return PRODUCTS.find((p) => p.slug === slug);
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
  const pool = catalog.length > 0 ? catalog : PRODUCTS;
  return getRelatedFromList(product, limit, pool);
}
