import { formatPrice } from "@/lib/format";

/**
 * Shipping math, parameterized by settings so cart/checkout can source values
 * from the SettingsProvider (Contentful-backed) with local defaults as fallback.
 */

/**
 * Standard shipping cost for a given subtotal: free at/over the threshold or
 * when the bag is empty, otherwise the flat standard rate.
 */
export function standardShipping(
  subtotal: number,
  threshold: number,
  standardRate: number,
): number {
  if (subtotal === 0 || subtotal >= threshold) return 0;
  return standardRate;
}

/** Free-shipping nudge copy shared by the drawer and cart summary. */
export function freeShipHint(
  subtotal: number,
  threshold: number,
  currency: string,
): string {
  const remaining = Math.max(0, threshold - subtotal);
  return remaining > 0
    ? `Add ${formatPrice(remaining, currency)} more for free shipping.`
    : "You’ve unlocked free shipping.";
}
