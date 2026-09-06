"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MAIN_NAV } from "@/components/layout/main-nav";
import type { INavLink } from "@/lib/contentful/siteSettings/siteSettingsClient";

interface IMobileNavProps {
  /** Extra storefront links from Contentful, appended after the mirrored nav. */
  extraLinks: INavLink[];
  bookNowLabel: string;
  bookNowUrl: string;
}

/**
 * Mobile drawer holding the same items as the desktop nav — alesea.co collapses
 * to a hamburger at this width too. Sub-menus render as an indented group
 * rather than a nested flyout, which is unusable on touch.
 */
export function MobileNav({
  extraLinks,
  bookNowLabel,
  bookNowUrl,
}: IMobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label="Open menu"
            className="-ml-2 flex size-11 items-center justify-center text-ink lg:hidden"
          />
        }
      >
        <Menu className="size-5" strokeWidth={1.6} aria-hidden />
      </SheetTrigger>
      <SheetContent side="left" className="bg-cream px-0">
        <SheetHeader className="px-6">
          <SheetTitle className="font-serif text-[20px] tracking-[0.28em] text-teal">
            ALESEA
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col overflow-y-auto pb-8">
          {MAIN_NAV.map((item) => (
            <div key={item.label} className="border-b border-line/70">
              {item.children ? (
                <>
                  <span className="block px-6 pt-4 pb-1 text-[11px] tracking-[0.2em] uppercase text-clay">
                    {item.label}
                  </span>
                  <div className="pb-3">
                    {item.children.map((child) => (
                      <a
                        key={child.href}
                        href={child.href}
                        rel="noopener noreferrer"
                        onClick={() => setOpen(false)}
                        className="block px-6 py-2.5 text-[13.5px] text-ink"
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                </>
              ) : (
                <a
                  href={item.href}
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="block px-6 py-4 text-[12px] tracking-[0.18em] uppercase text-ink"
                >
                  {item.label}
                </a>
              )}
            </div>
          ))}

          {extraLinks.map((link) => (
            <a
              key={`${link.label}-${link.href}`}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block border-b border-line/70 px-6 py-4 text-[12px] tracking-[0.18em] uppercase text-ink"
            >
              {link.label}
            </a>
          ))}

          <a
            href={bookNowUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="mx-6 mt-6 rounded-full bg-teal px-6 py-3.5 text-center text-[11.5px] tracking-[0.18em] uppercase text-white"
          >
            {bookNowLabel}
          </a>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
