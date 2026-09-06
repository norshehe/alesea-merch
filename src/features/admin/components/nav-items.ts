import {
  Boxes,
  House,
  LayoutDashboard,
  Mail,
  Package,
  Settings,
  ShoppingBag,
  Tags,
  type LucideIcon,
} from "lucide-react";

export interface IAdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Single source of truth for admin navigation. The desktop sidebar and the
 * mobile sheet both render this list, so a new section is added in one place.
 * Order is the order shown.
 */
export const ADMIN_NAV_ITEMS: readonly IAdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Inventory", href: "/admin/inventory", icon: Boxes },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Signups", href: "/admin/signups", icon: Mail },
  { label: "Categories", href: "/admin/categories", icon: Tags },
  { label: "Home page", href: "/admin/home", icon: House },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

/**
 * `/admin` is only active on an exact match — every other route starts with it,
 * so a prefix test would light up Dashboard everywhere.
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}
