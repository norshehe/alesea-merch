# Frontend Engineer — Memory Index

_Reusable implementation patterns and gotchas discovered while building. One line per memory file._

- [Alesea Shop storefront](project_alesea-shop-storefront.md) — Contentful-backed storefront with local catalog as per-field fallback; Server Components fetch, cart stays client/sync.
- [Cart line currency](feedback_cart-line-currency.md) — cart lines carry their own `currency`; format per-line totals with `line.currency`, not the global settings currency.
- [Airtable orders](project_airtable-orders.md) — checkout persists orders to Airtable via a server-only client + `placeOrder` Server Action with graceful degradation.
- [Airtable inventory](project_airtable-inventory.md) — per-variant stock from Airtable Inventory table; missing key ⇒ in stock, 0 ⇒ out, 1–5 ⇒ low; empty-map fallback when down.
- [Cross-site nav](project_cross-site-nav.md) — header/footer surface alesea.co nav + Book Now + socials from siteSettings; NavLink + isExternalHref decide internal/external & tab.
- [Brand system](project_brand-system.md) — storefront mirrors alesea.co: Playfair Display + Montserrat, exact brand hexes, teal pill CTAs; swatch hexes are product colours, not chrome.
- [PDP size guide](project_pdp-size-guide.md) — apparel size-guide table on PDP, gated to `category === "tees"`; static typed constants structured for a later Contentful move.
- [Admin route group](project_admin-route-group.md) — no root `app/layout.tsx`; `(storefront)` and `(admin)` are two sibling root layouts, fonts shared via `@/lib/fonts`.
- [Same-page hash nav](project_same-page-hash-nav.md) — on-page anchor CTAs (#shop-grid) use native `<a>`, not next/link; Link skips re-scroll on repeat clicks. Cross-page keeps Link.
