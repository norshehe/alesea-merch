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

/**
 * Pinned to Manila. Every caller renders on the server (UTC on Vercel), and a
 * date stamped in the Manila morning would otherwise print as the previous day.
 */
const MANILA_DATE_FORMAT = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Manila",
});

/**
 * "Oct 10, 2026" in Asia/Manila. Shared by the admin UI and every email, so
 * the date an admin sees on screen is the date the recipient reads.
 */
export function formatManilaDate(value: string | Date): string {
  return MANILA_DATE_FORMAT.format(
    typeof value === "string" ? new Date(value) : value,
  );
}
