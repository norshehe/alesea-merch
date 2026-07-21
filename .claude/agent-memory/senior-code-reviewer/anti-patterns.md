---
name: anti-patterns
description: Recurring anti-patterns to flag in alesea-merch reviews (Contentful layer bypass, currency hardcoding, hydration guards)
metadata:
  type: project
---

Recurring issues seen in storefront review work. Check for these each review.

**Contentful data layer bypassed by local constants.** A full Contentful product layer exists (`src/lib/contentful/product/productClient.ts`, `productHandler.ts` with `productKeys`, `IProduct`/`ProductSkeleton` types) but the storefront was built against a hardcoded `src/features/catalog/constants/products.ts` (`PRODUCTS`, `ICatalogProduct`, `CatalogCategory`). Result: two parallel product shapes (`IProduct` vs `ICatalogProduct`), `productHandler`/`productClient` are dead code, and pages have no loading/empty/error states because data is synchronous.
**Why:** CLAUDE.md mandates Contentful as the single product source and React Query handlers; the catalog types file documents the local catalog as a temporary stand-in ("Contentful space has no product content type yet").
**How to apply:** Flag any new component importing from `features/catalog/constants/products` instead of `useGetProducts`/`useGetProduct`. When the content type lands, the `ICatalogProduct` shape and local getters must be retired, not extended.

**Currency hardcoded to PHP in formatter, not carried on the line.** `src/lib/format.ts` `formatPrice` defaults `currency="PHP"` and only branches USD vs PH locale. Cart lines (`ICartLine`) and `ICatalogProduct` store `price` but no `currency`, so multi-currency is impossible and the design is implicitly PHP-only.
**Why:** CLAUDE.md says format money with the product's own `currency`, never assume. `IProduct` already carries `currency`.
**How to apply:** Flag `formatPrice(x)` calls that omit a currency sourced from the data. Push currency onto cart lines when cart starts from `IProduct`.

**Cart lines still carry no `currency`.** `ICartLine` in `store/cart.store.ts` copies `price` from `ICatalogProduct` but not `currency`. Cart/drawer/checkout format every line with the *global* `useSettings().currency`, not the product's own currency. Works only because everything is PHP today; a USD product in the bag would render with the PHP/global currency. CLAUDE.md says format with the product's own currency.
**How to apply:** When cart starts from a product that has `currency`, push it onto the line and format lines with `line.currency`.

**`accessories` filterKey has no home in `CatalogCategory`.** `ShopCategoryFilterKey` (shopCategory/response.ts) includes `"accessories"` and the home fallback seeds an Accessories category, but `CatalogCategory` is only tees|bags|caps|tumblers and `ProductGrid` filters by those. A category card linking to `#shop-grid` can never filter to accessories — and `productClient.toCategory` silently coerces any unknown Contentful category to `"tees"`, hiding model/code drift. Keep the product category union and shopCategory filter keys in sync; coerce-to-tees should at least `console.warn`.

**Per-field fallback boundary swaps whole-object, not per-field, for products.** `server/catalog.ts` `getCatalog()` returns the full local `PRODUCTS` array only when Contentful throws or returns zero items — it does NOT merge per-field like home/settings do. A Contentful product missing `images`/`blurb` renders with empty strings, not the local copy. This is intentional (products are the source of truth, not design copy) but differs from the home/settings per-field merge — don't assume uniform fallback semantics across the three server modules.

**Hardcoded product slugs / coming-soon copy in layout chrome.** Footer (`site-footer.tsx`) hardcodes `href="/products/weekender-tote"` and the literal "Tote · Coming Soon". Contentful is the product source of truth, so a slug rename or removal 404s the footer link and the coming-soon label desyncs from the product's `comingSoon` flag. Flag any hardcoded product slug or product-state string in header/footer/nav — derive from the catalog instead.

**Orphaned home-section components left behind after page edits.** Removing a section from `app/page.tsx` (e.g. `ShopByCategory`, `ShorelineGrid`) without deleting the component files leaves dead modules under `features/catalog/components/home/`, plus now-unused `IHomeContent` fields (`heroSecondaryCta`, `carryCta`, `editorialBody`, `editorialQuote`) still populated in the fallback and mapped in `homeClient`. Flag unreferenced section components and content fields for deletion, not retention.

**Zustand-persist hydration: only SiteHeader guards it.** `site-header.tsx` uses a `mounted` flag (now via `useSyncExternalStore`) to avoid SSR/client cart-count mismatch. Cart/checkout client components read persisted `lines`/`subtotal()` directly. Acceptable only because those are interactive client routes, but watch for persisted cart values rendered in any server-reachable/static path without a hydration guard.
