"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useCartStore } from "@/store/cart.store";
import { NavLink } from "@/components/layout/nav-link";
import type { INavLink } from "@/lib/contentful/siteSettings/siteSettingsClient";

const NAV_LINK =
  "text-[11.5px] tracking-[0.18em] uppercase transition-colors";

const noop = () => () => {};

interface ISiteHeaderProps {
  navLinks: INavLink[];
  bookNowLabel: string;
  bookNowUrl: string;
}

export function SiteHeader({
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
    <header className="sticky top-0 z-60 flex h-[74px] items-center justify-between border-b border-line bg-cream/[0.88] px-5 backdrop-blur-[14px] sm:px-10">
      <nav className="flex flex-1 items-center gap-5 sm:gap-[30px]">
        <NavLink
          href="https://alesea.co"
          className={`${NAV_LINK} -ml-2 flex min-h-11 min-w-11 items-center justify-center gap-1.5 text-stone hover:text-ink sm:ml-0 sm:min-w-0 sm:justify-start`}
          aria-label="Back to alesea.co"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.6} aria-hidden />
          <span className="hidden sm:inline">Back to Alesea</span>
        </NavLink>
        {navLinks.map((link) => (
          <NavLink
            key={`${link.label}-${link.href}`}
            href={link.href}
            className={`${NAV_LINK} hidden text-stone hover:text-ink sm:inline`}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <Link
        href="/"
        className="flex flex-col items-center leading-none"
        aria-label="Alesea Lifestyle, home"
      >
        <span className="font-serif text-[25px] tracking-[0.42em] [text-indent:0.42em] text-teal">
          ALESEA
        </span>
        <span className="mt-[5px] text-[8.5px] tracking-[0.5em] [text-indent:0.5em] uppercase text-teal">
          Lifestyle
        </span>
      </Link>

      <div className="flex flex-1 items-center justify-end gap-4 sm:gap-[26px]">
        <NavLink
          href={bookNowUrl}
          newTab
          className={`${NAV_LINK} rounded-full border border-teal bg-teal px-5 py-2 text-white transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal`}
        >
          {bookNowLabel}
        </NavLink>
        <button
          type="button"
          onClick={toggleCart}
          aria-label={`Open bag, ${mounted ? count : 0} items`}
          className={`${NAV_LINK} relative flex items-center gap-[9px] text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal`}
        >
          <span>Bag</span>
          <span className="inline-flex h-[21px] min-w-[21px] items-center justify-center rounded-[11px] bg-teal px-1.5 text-[11px] tracking-normal text-white">
            {mounted ? count : 0}
          </span>
        </button>
      </div>
    </header>
  );
}
