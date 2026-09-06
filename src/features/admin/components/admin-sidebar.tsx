"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ADMIN_NAV_ITEMS,
  isNavItemActive,
} from "@/features/admin/components/nav-items";

/**
 * Desktop admin navigation. Hand-rolled rather than shadcn's sidebar block:
 * this is a fixed-width list of eight links for three people — collapsing,
 * persistence and rail state would all be machinery with no user.
 * Client component only because active state needs `usePathname`.
 */
export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-sidebar hidden w-56 shrink-0 border-r md:block">
      <div className="flex h-14 items-center px-4">
        <Link href="/admin" className="font-serif text-lg tracking-tight">
          Alesea
          <span className="text-muted-foreground ml-2 font-sans text-[10px] tracking-[0.18em] uppercase">
            Admin
          </span>
        </Link>
      </div>
      <nav aria-label="Admin" className="grid gap-0.5 p-2">
        {ADMIN_NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isNavItemActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
