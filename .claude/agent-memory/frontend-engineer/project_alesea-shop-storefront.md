---
name: alesea-shop-storefront
description: The Alesea Shop storefront reads from Contentful (source of truth) with the local catalog as a typed per-field fallback. Server Components fetch; cart stays client/sync.
metadata:
  type: project
---

The storefront (home, product detail, cart, checkout) was built from the design at `docs/design/Alesea-Shop.dc.html`, then wired to **Contentful as the source of truth** with the local catalog as the offline/empty fallback (migration done 2026-06-21).

**Why:** The Contentful model (`product`, `shopCategory`, `homePage`, `siteSettings`) is now populated and published in space `qrm1ftb7ac4w` / env `master`. Goal was a data-source swap with zero visual change and a real fallback so the site renders identically if Contentful is unreachable.

**Architecture (how to apply):**
- **Normalize to UI shapes, not new ones.** Contentful `product` entries normalize to the existing `ICatalogProduct` (in `src/features/catalog/types.ts`) — added fields `currency` and `images: ICatalogImage[]`. Components were already coded against `ICatalogProduct`, so JSX changes stayed minimal.
- **Server data modules** live in `src/features/catalog/server/{catalog,home,settings}.ts` (marked `import "server-only"`). Each tries Contentful, then falls back **per field** to design defaults (`console.warn` on fallback). `getCatalog`, `getProduct`, `getRelated`, `getHomeContent`, `getSiteSettings`.
- **Two-file Contentful layer** per domain in `src/lib/contentful/{product,home,siteSettings}/*Client.ts` + types in `src/lib/contentful/types/<domain>/response.ts`. Object fields (colors/assurances/navLinks) need an index signature `[key: string]: string` to satisfy `EntryFieldTypes.Object<T>`'s JSON constraint.
- **Pages are Server Components** that fetch once and pass props down. `src/app/page.tsx` passes `content`/`products`; section components under `components/home/*` take a `content: IHomeContent` prop (defaults live in `getHomeContent`, NOT inline). `[slug]/page.tsx` uses `getCatalog()` for `generateStaticParams`. All Contentful-reading pages + layout export `revalidate = 60` (ISR).
- **Cart stays synchronous client state.** Shipping/currency for cart+checkout come from a `SettingsProvider` React context (`src/app/providers/settings-provider.tsx`), hydrated in `layout.tsx` from `getSiteSettings()`; `useSettings()` returns local defaults when no provider. `src/features/cart/lib/shipping.ts` helpers are now pure: they take `(threshold, rate, currency)` args.
- **Images:** render Contentful images with `next/image` when present (`product.images[0]` etc.), else keep the `dc-stripe` placeholder. Host `images.ctfassets.net` is allowlisted in `next.config.ts`; `toImages`/`assetUrl` normalize protocol-relative `//` URLs to `https:`.
- **Money:** `formatPrice(amount, currency)` from `@/lib/format`. Product price uses `product.currency`; cart/checkout totals use the settings currency. Never hardcode ₱/$.

**Gotchas:** Guard `product.colors[0]`/`sizes[0]` with `?.` — Contentful products may have empty arrays. Don't re-sort the catalog client-side; `getProductsFromContentful` sorts server-side via `order: ["fields.order", "fields.title"]`.
