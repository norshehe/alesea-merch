/**
 * Pure stock helpers — safe to import from client components.
 *
 * Inventory is keyed by `slug|Color|Size`. Semantics are deliberate:
 * a missing/unknown stock value means IN STOCK (so the store never blocks sales
 * when Airtable is down or a variant row is absent); only an explicit `0` is out.
 */

/** Variant identity used as the inventory map key: `slug|Color|Size`. */
export function variantKey(slug: string, color: string, size: string): string {
  return `${slug}|${color}|${size}`;
}

/** At or below this remaining count, a variant is considered "low" stock. */
export const LOW_STOCK_THRESHOLD = 5;

/** Coarse stock state for UI affordances. */
export type StockStatus = "in" | "low" | "out";

/**
 * Map a raw stock value to a status.
 * - `undefined` (unknown) ⇒ "in"
 * - `0` ⇒ "out"
 * - `1..LOW_STOCK_THRESHOLD` ⇒ "low"
 * - otherwise ⇒ "in"
 */
export function stockStatus(stock: number | undefined): StockStatus {
  if (stock === undefined) return "in";
  if (stock <= 0) return "out";
  if (stock <= LOW_STOCK_THRESHOLD) return "low";
  return "in";
}
