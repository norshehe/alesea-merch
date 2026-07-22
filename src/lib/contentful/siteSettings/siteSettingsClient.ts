import { contentful } from "@/lib/contentful";
import { toImage } from "@/lib/contentful/types/common";
import type { IImage } from "@/lib/contentful/types/common";
import type {
  INavLinkField,
  SiteSettingsSkeleton,
} from "@/lib/contentful/types/siteSettings/response";

/** A resolved navigation link. */
export interface INavLink {
  label: string;
  href: string;
}

/** Normalized site settings consumed by the layout, header and footer. */
export interface ISiteSettings {
  logo: IImage | null;
  currency: string;
  freeShipThreshold: number;
  standardShipping: number;
  expressShipping: number;
  location: string;
  footerBlurb: string;
  contactEmail: string;
  contactAddress: string;
  contactSocial: string;
  navLinks: INavLink[];
  bookNowLabel: string;
  bookNowUrl: string;
  socialLinks: INavLink[];
}

function toNavLinks(raw: INavLinkField[] | undefined): INavLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (l): l is INavLinkField =>
        typeof l?.label === "string" && typeof l?.href === "string",
    )
    .map((l) => ({ label: l.label, href: l.href }));
}

/**
 * Fetch the single `siteSettings` entry, normalized. Returns null when the
 * entry is missing so callers can apply per-field fallbacks.
 */
export async function getSiteSettingsFromContentful(): Promise<ISiteSettings | null> {
  const res = await contentful.getEntries<SiteSettingsSkeleton>({
    content_type: "siteSettings",
    limit: 1,
  });
  const entry = res.items[0];
  if (!entry) return null;
  const f = entry.fields;
  return {
    logo: toImage(f.logo),
    currency: f.currency ?? "PHP",
    freeShipThreshold:
      typeof f.freeShipThreshold === "number" ? f.freeShipThreshold : 0,
    standardShipping:
      typeof f.standardShipping === "number" ? f.standardShipping : 0,
    expressShipping:
      typeof f.expressShipping === "number" ? f.expressShipping : 0,
    location: f.location ?? "",
    footerBlurb: f.footerBlurb ?? "",
    contactEmail: f.contactEmail ?? "",
    contactAddress: f.contactAddress ?? "",
    contactSocial: f.contactSocial ?? "",
    navLinks: toNavLinks(f.navLinks),
    bookNowLabel: f.bookNowLabel ?? "",
    bookNowUrl: f.bookNowUrl ?? "",
    socialLinks: toNavLinks(f.socialLinks),
  };
}
