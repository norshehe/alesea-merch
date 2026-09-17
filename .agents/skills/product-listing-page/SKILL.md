---
name: product-listing-page
description: Build a product grid / catalog listing page with responsive cards, search, filters, pagination, and loading/empty/error states following alesea-merch conventions. Use whenever the user wants to create a catalog page, product grid, listing/index page for a content type, or says things like "create a product list", "build the catalog", "show all products", "add a collection page", or "list all X".
---

# Product Listing Page Builder

Generate a responsive listing page (product grid by default) wired to a Supabase server-side data function, with search, pagination, and all three data states.

## Prerequisites

The domain's data layer must exist (a `*Client.ts` under `src/lib/supabase/` normalizing rows to `I*` shapes, surfaced by a `server/*.ts` function). If it doesn't, write the migration and client first.

Read these references before building:

- `page-patterns` — grids, skeletons, empty/error states
- `nextjs-performance-ui` — Server vs Client split, `next/image`, Core Web Vitals
- `src/features/catalog/server/catalog.ts` — `getCatalog()` / `getProduct()`, the server functions to consume

## Structure

```
src/app/(store)/products/page.tsx        # route (Server Component shell)
src/features/catalog/components/
  product-grid.tsx                        # "use client" — search + grid + pagination
  product-card.tsx                        # single card (image, title, price, add-to-cart)
  product-grid-skeleton.tsx               # loading state
```

## Rules

1. **Server Component shell, Client interactive grid.** The `page.tsx` is a Server Component (metadata, layout). The grid that uses `useGetProducts` + search state is `"use client"`.
2. **Search** debounced via `useDebounce` (`@/hooks/use-debounce`), fed into the handler query.
3. **Pagination** via `skip`/`limit` on the query; show total from `ICollection.total`.
4. **Three states, always:**
   - Loading → `ProductGridSkeleton` (render N skeleton cards).
   - Empty (`items.length === 0`) → a calm empty state with guidance, not a blank screen.
   - Error (`isError`) → a short message + retry affordance.
5. **Cards**: `next/image` with proper `sizes` and a fixed aspect ratio (no layout shift). Price via `Intl.NumberFormat(undefined, { style: "currency", currency })`. Add-to-cart calls the cart store (see `cart-store`).
6. **Responsive grid**: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` (tune to design), consistent gap tokens.
7. **Accessibility**: each card is a link to the product detail; add-to-cart button has an accessible label.

## Card price helper

```tsx
const formatPrice = (price: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(price);
```

## After building

- Confirm `pnpm exec tsc --noEmit` passes.
- Note that the page needs valid Supabase env vars to render real data; without them `getCatalog()` returns `[]` and the empty state shows.
