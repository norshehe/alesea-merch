import type { CatalogCategory } from "../types";

/**
 * Pure UI config for the catalog. Product data itself lives in Supabase —
 * these are presentation constants with no data-source dependency.
 */

/** Slug of the coming-soon Weekender Tote — referenced by footer + cards. */
export const WEEKENDER_TOTE_SLUG = "weekender-tote";

/** Human labels for category keys. */
export const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  tees: "Tees",
  bags: "Bags",
  caps: "Caps",
  tumblers: "Tumblers",
};

/** Free-shipping threshold (PHP), matching the design's default. */
export const FREE_SHIP_THRESHOLD = 2500;

/** Standard / express shipping costs (PHP). */
export const SHIPPING = {
  standard: 150,
  express: 280,
} as const;
