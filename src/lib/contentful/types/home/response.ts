import type { EntryFieldTypes } from "contentful";
import type { ShopCategorySkeleton } from "@/lib/contentful/types/shopCategory/response";

/** Assurance item stored on the homePage entry (Object field). */
export interface IAssuranceField {
  title: string;
  body: string;
  // Index signature so the shape satisfies Contentful's JSON Object constraint.
  [key: string]: string;
}

/**
 * Raw Contentful entry skeleton for the `homePage` content type.
 * Mirrors the field IDs configured in the Contentful model.
 */
export interface HomePageSkeleton {
  contentTypeId: "homePage";
  fields: {
    title: EntryFieldTypes.Symbol;
    heroEyebrow: EntryFieldTypes.Symbol;
    heroHeading: EntryFieldTypes.Symbol;
    heroBody: EntryFieldTypes.Text;
    heroImage: EntryFieldTypes.AssetLink;
    heroPrimaryCta: EntryFieldTypes.Symbol;
    heroSecondaryCta: EntryFieldTypes.Symbol;
    categoryEyebrow: EntryFieldTypes.Symbol;
    categoryHeading: EntryFieldTypes.Symbol;
    categoryBody: EntryFieldTypes.Text;
    categories: EntryFieldTypes.Array<
      EntryFieldTypes.EntryLink<ShopCategorySkeleton>
    >;
    assurances: EntryFieldTypes.Object<IAssuranceField[]>;
    editorialEyebrow: EntryFieldTypes.Symbol;
    editorialHeading: EntryFieldTypes.Symbol;
    editorialBody: EntryFieldTypes.Text;
    editorialQuote: EntryFieldTypes.Text;
    editorialImage: EntryFieldTypes.AssetLink;
    editorialCta: EntryFieldTypes.Symbol;
    carryEyebrow: EntryFieldTypes.Symbol;
    carryHeading: EntryFieldTypes.Symbol;
    carryBody: EntryFieldTypes.Text;
    carryImage: EntryFieldTypes.AssetLink;
    carryCta: EntryFieldTypes.Symbol;
    shorelineHandle: EntryFieldTypes.Symbol;
    shorelineHeading: EntryFieldTypes.Symbol;
    shorelineBody: EntryFieldTypes.Text;
  };
}
