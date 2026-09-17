import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * The chips-and-pager chrome shared by every paginated admin list.
 *
 * `/admin/orders` and `/admin/signups` each defined these two components
 * verbatim. Server Components, so they stay out of the client bundle — the only
 * interactive part of these lists is the search box.
 */

/** One status filter. Filter state lives in the URL, so it is a link, not a button. */
export function FilterChip({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Button
      size="sm"
      variant={active ? "secondary" : "ghost"}
      aria-current={active ? "page" : undefined}
      render={<Link href={href} />}
    >
      {label}
      <span className="text-muted-foreground tabular-nums">{count}</span>
    </Button>
  );
}

/**
 * A disabled anchor is still clickable, so the boundary case renders a real
 * disabled <button> instead of a Link that goes nowhere.
 */
export function PagerLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" render={<Link href={href} />}>
      {children}
    </Button>
  );
}
