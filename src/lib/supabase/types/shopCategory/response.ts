/** Filter keys a shop category can map to. */
export type ShopCategoryFilterKey =
  | "tees"
  | "bags"
  | "caps"
  | "tumblers"
  | "accessories"
  | "all";

/** Normalized shop-category card consumed by the home UI. */
export interface IShopCategory {
  id: string;
  label: string;
  eyebrow: string;
  filterKey: ShopCategoryFilterKey;
  image: string | null;
}
