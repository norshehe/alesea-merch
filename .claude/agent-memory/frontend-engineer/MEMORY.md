# Frontend Engineer — Memory Index

_Reusable implementation patterns and gotchas discovered while building. One line per memory file._

- [Alesea Shop storefront](project_alesea-shop-storefront.md) — Supabase-backed storefront (no local catalog fallback); Server Components fetch, cart stays client/sync.
- [Cart line currency](feedback_cart-line-currency.md) — cart lines carry their own `currency`; format per-line totals with `line.currency`, not the global settings currency.
- [Airtable orders](project_airtable-orders.md) — checkout persists orders to Airtable via a server-only client + `placeOrder` Server Action with graceful degradation.
- [Variant inventory](project_airtable-inventory.md) — per-variant stock (now Supabase `inventory_by_slug`); missing key ⇒ in stock, 0 ⇒ out, 1–5 ⇒ low; empty-map fallback when down.\n- [Supabase read-path migration](project_supabase-read-path-migration.md) — read path on Supabase since 2026-09-06; never use a cookie-bound client in the storefront.
- [Supabase write-path migration](project_supabase-write-path-migration.md) — orders/signups on Supabase service-role since 2026-09-06; Airtable + Contentful deleted.
- [Cross-site nav](project_cross-site-nav.md) — header/footer surface alesea.co nav + Book Now + socials from siteSettings; NavLink + isExternalHref decide internal/external & tab.
- [Brand system](project_brand-system.md) — storefront mirrors alesea.co: Playfair Display + Montserrat, exact brand hexes, teal pill CTAs; swatch hexes are product colours, not chrome.
- [PDP size guide](project_pdp-size-guide.md) — apparel size-guide table on PDP, gated to `category === "tees"`; static typed constants structured for a later Contentful move.
- [Admin route group](project_admin-route-group.md) — no root `app/layout.tsx`; `(storefront)` and `(admin)` are two sibling root layouts, fonts shared via `@/lib/fonts`.
- [Same-page hash nav](project_same-page-hash-nav.md) — on-page anchor CTAs (#shop-grid) use native `<a>`, not next/link; Link skips re-scroll on repeat clicks. Cross-page keeps Link.
