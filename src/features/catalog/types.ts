/** A selectable colour option for a product. */
export interface IProductColor {
  name: string;
  hex: string;
}

/** Product category keys used across the storefront. */
export type CatalogCategory = "tees" | "bags" | "caps" | "tumblers";

/**
 * Storefront product shape consumed by the UI.
 *
 * This currently comes from a local catalog (the Contentful space has no
 * `product` content type yet). It is intentionally close to a normalized
 * Contentful shape so it can be swapped for `contentful-domain-scaffolder`
 * output later — keep components depending on this interface, not raw data.
 */
export interface ICatalogProduct {
  id: string;
  slug: string;
  category: CatalogCategory;
  name: string;
  price: number;
  /** ISO currency for `price` (e.g. "PHP", "USD"). Defaults to PHP. */
  currency: string;
  blurb: string;
  materials: string;
  colors: IProductColor[];
  sizes: string[];
  /** Label for the size selector (e.g. "Size", "Fit"). */
  sizeLabel: string;
  /**
   * Product imagery from Contentful. Empty when none was seeded — the UI
   * falls back to the `dc-stripe` placeholder in that case.
   */
  images: ICatalogImage[];
}

/** Normalized product image (subset of the Contentful asset). */
export interface ICatalogImage {
  url: string;
  alt: string;
  width: number;
  height: number;
}
