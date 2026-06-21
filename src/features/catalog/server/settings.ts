import "server-only";
import {
  getSiteSettingsFromContentful,
  type ISiteSettings,
} from "@/lib/contentful/siteSettings/siteSettingsClient";
import {
  FREE_SHIP_THRESHOLD,
  SHIPPING,
} from "@/features/catalog/constants/products";

/**
 * Hardcoded defaults matching the current design. Used per-field when
 * Contentful is unreachable or a field is empty, so the site renders
 * identically to before the data-source swap.
 */
export const SETTINGS_FALLBACK: ISiteSettings = {
  currency: "PHP",
  freeShipThreshold: FREE_SHIP_THRESHOLD,
  standardShipping: SHIPPING.standard,
  expressShipping: SHIPPING.express,
  location: "La Union, PH",
  footerBlurb:
    "Beachfront villas in La Union — and the goods to remember them by.",
  contactEmail: "hello@alesea.co",
  contactAddress: "BGC, Taguig, PH",
  contactSocial: "Instagram · Facebook",
  navLinks: [
    { label: "Shop", href: "/" },
    { label: "Villas & Suites", href: "https://www.alesea.co/villas---suites" },
    { label: "About", href: "https://www.alesea.co/about-alesea" },
  ],
  bookNowLabel: "Book Now",
  bookNowUrl: "https://book.alesea.co/all-listings",
  socialLinks: [
    { label: "Instagram", href: "https://www.instagram.com/alesea.co" },
    { label: "Facebook", href: "https://www.facebook.com/alesea.co" },
    { label: "YouTube", href: "https://www.youtube.com/@alesea" },
  ],
};

/** Merge a Contentful value with its fallback when empty. */
function str(value: string | undefined, fallback: string): string {
  return value && value.trim().length > 0 ? value : fallback;
}

function num(value: number | undefined, fallback: number): number {
  return typeof value === "number" && value > 0 ? value : fallback;
}

/**
 * Site settings for Server Components. Contentful first, with per-field
 * fallback to {@link SETTINGS_FALLBACK} so missing data never breaks render.
 */
export async function getSiteSettings(): Promise<ISiteSettings> {
  let remote: ISiteSettings | null = null;
  try {
    remote = await getSiteSettingsFromContentful();
  } catch (error) {
    console.warn(
      "[settings] Contentful siteSettings fetch failed — using defaults.",
      error,
    );
  }
  if (!remote) return SETTINGS_FALLBACK;

  return {
    currency: str(remote.currency, SETTINGS_FALLBACK.currency),
    freeShipThreshold: num(
      remote.freeShipThreshold,
      SETTINGS_FALLBACK.freeShipThreshold,
    ),
    standardShipping: num(
      remote.standardShipping,
      SETTINGS_FALLBACK.standardShipping,
    ),
    expressShipping: num(
      remote.expressShipping,
      SETTINGS_FALLBACK.expressShipping,
    ),
    location: str(remote.location, SETTINGS_FALLBACK.location),
    footerBlurb: str(remote.footerBlurb, SETTINGS_FALLBACK.footerBlurb),
    contactEmail: str(remote.contactEmail, SETTINGS_FALLBACK.contactEmail),
    contactAddress: str(remote.contactAddress, SETTINGS_FALLBACK.contactAddress),
    contactSocial: str(remote.contactSocial, SETTINGS_FALLBACK.contactSocial),
    navLinks:
      remote.navLinks.length > 0 ? remote.navLinks : SETTINGS_FALLBACK.navLinks,
    bookNowLabel: str(remote.bookNowLabel, SETTINGS_FALLBACK.bookNowLabel),
    bookNowUrl: str(remote.bookNowUrl, SETTINGS_FALLBACK.bookNowUrl),
    socialLinks:
      remote.socialLinks.length > 0
        ? remote.socialLinks
        : SETTINGS_FALLBACK.socialLinks,
  };
}

export type { ISiteSettings } from "@/lib/contentful/siteSettings/siteSettingsClient";
