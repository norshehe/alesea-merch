/**
 * Format an amount in the storefront's currency.
 * The design prices are whole PHP values; we render no decimals to match.
 */
export function formatPrice(amount: number, currency = "PHP"): string {
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-PH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
