import type { EntryFieldTypes } from "contentful";

/** Filter keys a shop category can map to. */
export type ShopCategoryFilterKey =
  | "tees"
  | "bags"
  | "caps"
  | "tumblers"
  | "accessories"
  | "all";

/**
 * Raw Contentful entry skeleton for the `shopCategory` content type.
 * Mirrors the field IDs configured in the Contentful model.
 */
export interface ShopCategorySkeleton {
  contentTypeId: "shopCategory";
  fields: {
    label: EntryFieldTypes.Symbol;
    eyebrow: EntryFieldTypes.Symbol;
    filterKey: EntryFieldTypes.Symbol<ShopCategoryFilterKey>;
    image: EntryFieldTypes.AssetLink;
    order: EntryFieldTypes.Integer;
  };
}

/** Normalized shop-category card consumed by the home UI. */
export interface IShopCategory {
  id: string;
  label: string;
  eyebrow: string;
  filterKey: ShopCategoryFilterKey;
  image: string | null;
}
