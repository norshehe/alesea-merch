import type { EntryFieldTypes } from "contentful";

/** Navigation link stored on the siteSettings entry (Object field). */
export interface INavLinkField {
  label: string;
  href: string;
  // Index signature so the shape satisfies Contentful's JSON Object constraint.
  [key: string]: string;
}

/**
 * Raw Contentful entry skeleton for the `siteSettings` content type.
 * Mirrors the field IDs configured in the Contentful model.
 */
export interface SiteSettingsSkeleton {
  contentTypeId: "siteSettings";
  fields: {
    title: EntryFieldTypes.Symbol;
    currency: EntryFieldTypes.Symbol;
    freeShipThreshold: EntryFieldTypes.Integer;
    standardShipping: EntryFieldTypes.Integer;
    expressShipping: EntryFieldTypes.Integer;
    location: EntryFieldTypes.Symbol;
    footerBlurb: EntryFieldTypes.Text;
    contactEmail: EntryFieldTypes.Symbol;
    contactAddress: EntryFieldTypes.Symbol;
    contactSocial: EntryFieldTypes.Symbol;
    navLinks: EntryFieldTypes.Object<INavLinkField[]>;
    bookNowLabel: EntryFieldTypes.Symbol;
    bookNowUrl: EntryFieldTypes.Symbol;
    socialLinks: EntryFieldTypes.Object<INavLinkField[]>;
  };
}
