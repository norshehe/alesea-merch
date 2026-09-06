/**
 * The alesea.co main-site navigation, mirrored here so the storefront header
 * reads as the same site.
 *
 * Source of truth is https://www.alesea.co/ — labels, order and hrefs were taken
 * from its live header. This is deliberately a code constant rather than a
 * Contentful field: it mirrors *another* site's information architecture, not
 * shop content, so it should change when alesea.co changes, not when a shop
 * editor edits an entry. Contentful `siteSettings.navLinks` still renders as
 * additional trailing items (see `site-header.tsx`).
 */
export interface IMainNavItem {
  label: string;
  href: string;
  /** Sub-items render in a dropdown; the parent is then not itself a link. */
  children?: { label: string; href: string }[];
}

const SITE = "https://www.alesea.co";

export const MAIN_NAV: IMainNavItem[] = [
  { label: "Home", href: `${SITE}/` },
  { label: "Villas & Suites", href: `${SITE}/villas---suites` },
  {
    label: "Availability",
    href: `${SITE}/baroro-availability`,
    children: [
      { label: "Baroro | 3-Bedroom", href: `${SITE}/baroro-availability` },
      { label: "Tammocalao | 4-Bedroom", href: `${SITE}/tammocalao-availability` },
      { label: "Oeste | 7-Bedroom", href: `${SITE}/oeste-availability` },
      { label: "Suites | 1-Bedroom", href: `${SITE}/availability---suites` },
    ],
  },
  {
    label: "About",
    href: `${SITE}/about-alesea`,
    children: [
      { label: "Our Story", href: `${SITE}/about-alesea` },
      { label: "FAQs", href: `${SITE}/faqs` },
      { label: "Guides & Stories", href: `${SITE}/journal` },
    ],
  },
];
