---
name: nextjs-performance-ui
description: Expert guide for building high-performance, minimalist storefront UI in the alesea-merch Next.js app. Read when implementing or improving any page, component, or layout — especially for visual quality, load speed, bundle size, render performance, Core Web Vitals, or design consistency. Covers Server vs Client components, Suspense/streaming, next/image, next/font, caching for Contentful data, memoization, and minimalist Tailwind. Trigger phrases - "improve performance", "optimize component", "make it faster", "minimalist design", "clean up the UI", "reduce bundle size", "lazy load", "skeleton", "layout shift", "enhance the interface".
---

# Next.js Performance & Minimalist UI

Guide for clean, fast storefront UI. Five areas: **Server vs Client**, **Data & Caching**, **Component Performance**, **Minimalist Tailwind**, **Core Web Vitals**.

## 1. Server vs Client (Next.js 16 App Router)

- **Default to Server Components.** They ship zero JS. Reach for `"use client"` only for interactivity (cart, forms, hooks, event handlers).
- Push `"use client"` to the **leaves**. A page can be a Server Component with small client islands (AddToCartButton, SearchBar) rather than one big client tree.
- `params`/`searchParams` are async — `await` them.
- Use `<Suspense>` to stream slow sections; pair with skeleton fallbacks.

## 2. Data & caching (Contentful)

- Fetch Contentful in Server Components for first paint (SEO, no client waterfall) **or** via React Query handlers for interactive/refetchable surfaces — not both for the same data.
- For mostly-static catalog content, use route segment caching / `revalidate` (ISR) so pages aren't rebuilt per request. Add on-demand revalidation when content changes if needed.
- React Query defaults here: `staleTime 60s`, `refetchOnWindowFocus false`. Tune per surface.
- Always set `enabled` guards on dependent queries.

## 3. Component performance

- Stable query keys (use the `*Keys` factories) to avoid refetch storms.
- Memoize expensive derived data; subscribe to **narrow** Zustand slices (`(s) => s.count()`).
- Avoid passing new object/array literals as props every render where it triggers re-renders of memoized children.
- Lazy-load heavy, below-the-fold, or rarely-used client components with `next/dynamic`.

## 4. Minimalist Tailwind

- Product-first: let imagery breathe; minimize chrome (borders/shadows/dividers).
- Use design tokens (spacing/color/radius scales) — avoid arbitrary `[13px]` values when a token fits.
- Consistent spacing rhythm and a small type scale. Don't introduce new colors casually.
- Every element earns its place; remove redundant labels and decoration.

## 5. Core Web Vitals

- **LCP**: hero/product images via `next/image` with `priority` on the above-the-fold image; correct `sizes`.
- **CLS**: fixed aspect-ratio image wrappers; reserve space for async content (skeletons same size as content).
- **INP**: keep client bundles small; debounce search; avoid blocking the main thread.
- **Fonts**: `next/font` (already set up with Geist) — no layout shift, no external font requests.
- Use Contentful's Image API params (`?w=&fm=webp&q=`) to serve right-sized, modern-format images.
