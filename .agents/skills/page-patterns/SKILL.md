---
name: page-patterns
description: Reference guide for building pages in the alesea-merch storefront. Covers page layout, sections, responsive product grids, dialogs and sheets, skeleton loading, empty and error states, animations, and money/image formatting. Read this when building any new page or component; do not invoke as a workflow step.
---

# Page Patterns

Reference for building storefront pages. Read it; don't run it.

## Page layout

- Default routes to **Server Components**. Mark interactive pieces `"use client"`.
- `params` / `searchParams` are **async** in Next.js 16 — `await` them.
- Page-level metadata via `export const metadata` or `generateMetadata` (async).
- Wrap page content in a max-width container with consistent horizontal padding (e.g. `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`).

## Data states (every data surface needs all three)

```tsx
if (isLoading) return <GridSkeleton count={8} />;
if (isError)   return <ErrorState onRetry={refetch} />;
if (!items.length) return <EmptyState title="No products yet" />;
return <Grid items={items} />;
```

- **Loading** → `Skeleton` from `@/components/ui/skeleton`, shaped like the real content (cards, not spinners).
- **Empty** → calm message + a next action (link to catalog / clear filters). Never a blank screen.
- **Error** → short human message + retry. Don't dump the raw error.

## Responsive product grid

```tsx
<ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
  {items.map((p) => <ProductCard key={p.id} product={p} />)}
</ul>
```

## Images

- Always `next/image`. Provide `sizes` matching the grid breakpoints to avoid over-fetching.
- Fixed aspect ratio wrapper (`aspect-square` / `aspect-[3/4]`) to prevent layout shift.
- Images come from the public `media` bucket in Supabase Storage; `publicUrl(path)` builds the URL. Let `next/image` handle resizing and format — do not hand-append transform params. Any new host must be added to `next.config.ts` `remotePatterns` or it 500s.

## Money

```tsx
new Intl.NumberFormat(undefined, { style: "currency", currency }).format(price);
```

Never hardcode `$`. Always use the entity's `currency`.

## Dialogs & sheets

- `Dialog` for focused modal actions; `Sheet` for the cart drawer and mobile nav.
- Both from `@/components/ui`. Reset internal form state on open/close.

## Animations

- Keep motion subtle and purposeful (hover lifts, fade-in on mount). Avoid gratuitous animation.
- Prefer CSS transitions / Tailwind for simple cases; reach for a motion library only when a transition genuinely needs it.

## Feedback

- Sonner `toast` (mounted in root layout) for transient confirmations only.
- Form validation errors render inline via `<FormMessage />`, never as toasts.
