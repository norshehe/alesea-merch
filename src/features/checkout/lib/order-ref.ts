/**
 * Generate a demo order reference like `ALS-7F3QK`.
 * Kept at module scope so it stays out of React component render analysis
 * (it is intentionally impure — called only from a submit handler).
 */
export function generateOrderRef(): string {
  return `ALS-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}
