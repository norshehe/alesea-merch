import Link from "next/link";
import { NavLink } from "@/components/layout/nav-link";
import { CATEGORY_LABELS } from "@/features/catalog/constants/products";
import type { CatalogCategory } from "@/features/catalog/types";
import type { ISiteSettings } from "@/lib/contentful/siteSettings/siteSettingsClient";

const ALESEA_LINK =
  "text-left text-sm font-light text-[#D9CEBC] transition-colors hover:text-white";

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as CatalogCategory[];

interface ISiteFooterProps {
  settings: ISiteSettings;
}

export function SiteFooter({ settings }: ISiteFooterProps) {
  return (
    <footer className="bg-teal px-6 pt-[72px] pb-9 text-[#D9CEBC] sm:px-14">
      <div className="grid grid-cols-1 gap-10 border-b border-[#D9CEBC]/[0.16] pb-[54px] sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <span className="font-serif text-[26px] tracking-[0.4em] [text-indent:0.4em] text-foam">
            ALESEA
          </span>
          <p className="mt-[18px] max-w-[280px] text-sm leading-[1.7] font-light text-[#A99E8B]">
            {settings.footerBlurb}
          </p>
        </div>

        <div className="flex flex-col gap-[13px]">
          <span className="mb-1 text-[11px] tracking-[0.2em] uppercase text-[#8B8170]">
            Shop
          </span>
          {CATEGORY_KEYS.map((key) => (
            <Link
              key={key}
              href="/#shop-grid"
              className="text-left text-sm text-[#D9CEBC] transition-colors hover:text-white"
            >
              {CATEGORY_LABELS[key]}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-[13px]">
          <span className="mb-1 text-[11px] tracking-[0.2em] uppercase text-[#8B8170]">
            Alesea
          </span>
          <NavLink
            href="https://www.alesea.co/villas---suites"
            className={ALESEA_LINK}
          >
            Villas &amp; Suites
          </NavLink>
          <NavLink href="https://www.alesea.co/about-alesea" className={ALESEA_LINK}>
            About
          </NavLink>
          <NavLink href={settings.bookNowUrl} newTab className={ALESEA_LINK}>
            {settings.bookNowLabel}
          </NavLink>
        </div>

        <div className="flex flex-col gap-[13px]">
          <span className="mb-1 text-[11px] tracking-[0.2em] uppercase text-[#8B8170]">
            Contact
          </span>
          {settings.contactEmail ? (
            <NavLink
              href={`mailto:${settings.contactEmail}`}
              className={ALESEA_LINK}
            >
              {settings.contactEmail}
            </NavLink>
          ) : null}
          <span className="text-sm font-light text-[#D9CEBC]">
            {settings.contactAddress}
          </span>
          {settings.socialLinks.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {settings.socialLinks.map((link) => (
                <NavLink
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  newTab
                  className={ALESEA_LINK}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          ) : (
            <span className="text-sm font-light text-[#D9CEBC]">
              {settings.contactSocial}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-6 text-xs font-light text-[#8B8170] sm:flex-row sm:justify-between">
        <span>© 2026 Alesea Collection. All rights reserved.</span>
        <span>Coastal goods, shipped from the Philippines.</span>
      </div>
    </footer>
  );
}
