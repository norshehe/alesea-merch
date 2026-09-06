"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/store/cart.store";
import { NavLink } from "@/components/layout/nav-link";
import { NavDropdown } from "@/components/layout/nav-dropdown";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MAIN_NAV } from "@/components/layout/main-nav";
import type { INavLink } from "@/lib/supabase/siteSettings/siteSettingsClient";
import type { IImage } from "@/lib/supabase/types/common";

/**
 * Top-level nav item styling, mirroring alesea.co's header: uppercase, 14px,
 * `#14201b`, 20px of horizontal padding, and a 2px underline that appears on
 * hover/focus (the main site also bolds the label on hover).
 */
const NAV_LINK =
  "relative px-5 py-1 text-[14px] tracking-[0.04em] uppercase text-[#14201b] transition-[font-weight,color] hover:font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal after:absolute after:inset-x-5 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-current after:transition-transform hover:after:scale-x-100";

const noop = () => () => {};

interface ISiteHeaderProps {
  logo?: IImage | null;
  /**
   * Storefront-specific links from Contentful, appended after the mirrored
   * alesea.co items. Empty by default — the main nav lives in `MAIN_NAV`.
   */
  navLinks: INavLink[];
  bookNowLabel: string;
  bookNowUrl: string;
}

export function SiteHeader({
  logo,
  navLinks,
  bookNowLabel,
  bookNowUrl,
}: ISiteHeaderProps) {
  const count = useCartStore((s) => s.count());
  const toggleCart = useCartStore((s) => s.toggleCart);

  // Hydration-safe count: persisted cart is only available client-side, so the
  // SSR render (false) and first client render must match before we show the
  // badge. useSyncExternalStore gives false on the server, true on the client
  // without a setState-in-effect cascade.
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  return (
    <header className="sticky top-0 z-60 flex h-[74px] items-center gap-4 border-b border-line bg-cream/[0.88] px-5 backdrop-blur-[14px] sm:px-10">
      <MobileNav
        extraLinks={navLinks}
        bookNowLabel={bookNowLabel}
        bookNowUrl={bookNowUrl}
      />

      <Link
        href="/"
        className="flex shrink-0 flex-col leading-none"
        aria-label="Alesea Lifestyle, shop home"
      >
        {logo?.width ? (
          <Image
            src={logo.url}
            alt="Alesea Lifestyle"
            width={logo.width}
            height={logo.height}
            priority
            sizes="120px"
            className="block h-8 w-auto"
          />
        ) : (
          <>
            <span className="font-serif text-[22px] tracking-[0.4em] [text-indent:0.4em] text-teal">
              ALESEA
            </span>
            <span className="mt-[4px] text-[7.5px] tracking-[0.5em] [text-indent:0.5em] uppercase text-teal">
              Lifestyle
            </span>
          </>
        )}
      </Link>

      {/* Mirrored alesea.co nav — hidden on mobile, where MobileNav takes over. */}
      <nav className="hidden flex-1 items-center lg:flex" aria-label="Main">
        {MAIN_NAV.map((item) =>
          item.children ? (
            <NavDropdown key={item.label} item={item} triggerClass={NAV_LINK} />
          ) : (
            <NavLink key={item.label} href={item.href} className={NAV_LINK}>
              {item.label}
            </NavLink>
          ),
        )}
        {navLinks.map((link) => (
          <NavLink
            key={`${link.label}-${link.href}`}
            href={link.href}
            className={NAV_LINK}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-1 items-center justify-end gap-4 sm:gap-[26px] lg:flex-none">
        <button
          type="button"
          onClick={toggleCart}
          aria-label={`Open bag, ${mounted ? count : 0} items`}
          className="relative flex items-center gap-[9px] text-[11.5px] tracking-[0.18em] uppercase text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
        >
          <span>Bag</span>
          <span className="inline-flex h-[21px] min-w-[21px] items-center justify-center rounded-[11px] bg-teal px-1.5 text-[11px] tracking-normal text-white">
            {mounted ? count : 0}
          </span>
        </button>
        <NavLink
          href={bookNowUrl}
          newTab
          className="hidden rounded-full border border-teal bg-teal px-7 py-2.5 text-[13px] tracking-[0.06em] uppercase text-white transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal sm:inline-block"
        >
          {bookNowLabel}
        </NavLink>
      </div>
    </header>
  );
}
