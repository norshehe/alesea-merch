import Link from "next/link";
import { NavLink } from "@/components/layout/nav-link";
import { WEEKENDER_TOTE_SLUG } from "@/features/catalog/constants/products";
import type { ISiteSettings } from "@/lib/supabase/siteSettings/siteSettingsClient";

const ALESEA_LINK =
  "text-left text-sm font-normal text-[#D9CEBC] transition-colors hover:text-white";
const SHOP_LINK =
  "text-left text-sm text-[#D9CEBC] transition-colors hover:text-white";
const COL_HEADING =
  "mb-1 text-[11px] tracking-[0.2em] uppercase text-[#8B8170]";

// TODO: move to a `site_settings` column once a phone field exists.
const PHONE = "(+63) 968 869 8918";

interface ISiteFooterProps {
  settings: ISiteSettings;
}

export function SiteFooter({ settings }: ISiteFooterProps) {
  return (
    <footer className="bg-teal px-6 pt-[72px] pb-9 text-[#D9CEBC] sm:px-14">
      <div className="grid grid-cols-1 gap-10 border-b border-[#D9CEBC]/[0.16] pb-[54px] sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <span className="flex flex-col leading-none">
            <span className="font-serif text-[26px] tracking-[0.4em] [text-indent:0.4em] text-foam">
              ALESEA
            </span>
            <span className="mt-[6px] text-[8.5px] tracking-[0.5em] [text-indent:0.5em] uppercase text-foam">
              Lifestyle
            </span>
          </span>
          <p className="mt-[18px] max-w-[280px] text-sm leading-[1.7] font-normal text-[#A99E8B]">
            {settings.footerBlurb}
          </p>
          <Link
            href="/products"
            className="mt-5 inline-block rounded-full border border-foam bg-foam px-6 py-3 text-[11px] tracking-[0.18em] uppercase text-teal transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foam"
          >
            Shop the Collection
          </Link>
        </div>

        <div className="flex flex-col gap-[13px]">
          <span className={COL_HEADING}>Shop</span>
          <Link href="/products" className={SHOP_LINK}>
            All Products
          </Link>
          <Link href="/products?category=tees" className={SHOP_LINK}>
            Tees
          </Link>
          <Link href={`/products/${WEEKENDER_TOTE_SLUG}`} className={SHOP_LINK}>
            Tote · Coming Soon
          </Link>
        </div>

        <div className="flex flex-col gap-[13px]">
          <span className={COL_HEADING}>Alesea</span>
          <NavLink href="https://alesea.co" className={ALESEA_LINK}>
            alesea.co
          </NavLink>
          <NavLink
            href="https://www.alesea.co/villas---suites"
            className={ALESEA_LINK}
          >
            Villas and Suites
          </NavLink>
          <NavLink
            href="https://www.alesea.co/about-alesea"
            className={ALESEA_LINK}
          >
            About
          </NavLink>
          <NavLink href={settings.bookNowUrl} newTab className={ALESEA_LINK}>
            {settings.bookNowLabel}
          </NavLink>
        </div>

        <div className="flex flex-col gap-[13px]">
          <span className={COL_HEADING}>Contact</span>
          {settings.contactEmail ? (
            <NavLink
              href={`mailto:${settings.contactEmail}`}
              className={ALESEA_LINK}
            >
              {settings.contactEmail}
            </NavLink>
          ) : null}
          <NavLink href={`tel:${PHONE.replace(/[^\d+]/g, "")}`} className={ALESEA_LINK}>
            {PHONE}
          </NavLink>
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
            <span className="text-sm font-normal text-[#D9CEBC]">
              {settings.contactSocial}
            </span>
          )}
        </div>
      </div>

      <div className="pt-6 text-xs font-normal text-[#8B8170]">
        <span>
          © 2026 Alesea Collection. All rights reserved. Coastal goods, shipped
          from the Philippines.
        </span>
      </div>
    </footer>
  );
}
