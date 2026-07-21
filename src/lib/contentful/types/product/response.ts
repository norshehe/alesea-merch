import type { EntryFieldTypes } from "contentful";

/** A selectable colour option stored on a product entry (Object field). */
export interface IProductColorField {
  name: string;
  hex: string;
  // Index signature so the shape satisfies Contentful's JSON Object constraint.
  [key: string]: string;
}

/**
 * Raw Contentful entry skeleton for the `product` content type.
 * Mirrors the field IDs configured in the Contentful model.
 */
export interface ProductSkeleton {
  contentTypeId: "product";
  fields: {
    title: EntryFieldTypes.Symbol;
    slug: EntryFieldTypes.Symbol;
    category: EntryFieldTypes.Symbol<"tees" | "bags" | "caps" | "tumblers">;
    price: EntryFieldTypes.Integer;
    currency: EntryFieldTypes.Symbol<"PHP" | "USD">;
    blurb: EntryFieldTypes.Text;
    materials: EntryFieldTypes.Text;
    sizeLabel: EntryFieldTypes.Symbol;
    sizes: EntryFieldTypes.Array<EntryFieldTypes.Symbol>;
    colors: EntryFieldTypes.Object<IProductColorField[]>;
    images: EntryFieldTypes.Array<EntryFieldTypes.AssetLink>;
    available: EntryFieldTypes.Boolean;
    /** When true, the product is a teaser: no price/variants, "Notify Me" only. */
    comingSoon?: EntryFieldTypes.Boolean;
    order: EntryFieldTypes.Integer;
  };
}
