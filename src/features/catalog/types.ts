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
 * This is the normalized boundary type: `productClient.ts` maps Supabase rows
 * (plus their `product_images`) onto it, and every component depends on this
 * interface rather than on raw Postgrest rows. Treat it as a frozen contract —
 * changing it ripples through the grid, card, detail page and cart.
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
   * Product imagery, ordered by `position`. Empty when none was uploaded —
   * the UI falls back to the `dc-stripe` placeholder in that case.
   */
  images: ICatalogImage[];
  /**
   * Pre-launch teaser flag. When true the product has no purchasable price:
   * grid/detail replace price + "Add to bag" with an email-capture form.
   */
  comingSoon?: boolean;
}

/** Normalized product image (a resolved `product_images` row). */
export interface ICatalogImage {
  url: string;
  alt: string;
  width: number;
  height: number;
}
