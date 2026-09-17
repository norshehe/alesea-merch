---
name: supabase-read-path-migration
description: Storefront read path was cut over to Supabase on 2026-09-06; write path (orders/signups) still on Airtable, and src/lib/{contentful,airtable} are kept on disk on purpose.
metadata:
  type: project
---

The storefront **read path** (products, images, site settings, home content, shop categories, inventory) was cut over from Contentful + Airtable to **Supabase** on 2026-09-06 (Track A, phases 1–3 of an approved migration plan).

**Why:** consolidate content, catalog and stock into one Postgres source with RLS, so an admin UI can be built against it later. Hard constraint from the user: **zero UI component changes** — every component consumes the normalized `I*` interfaces, so the swap happens entirely behind `src/features/catalog/server/*`.

**How to apply:**
- The **write path is still Airtable** — `src/features/checkout/server/place-order.ts`, `src/features/catalog/server/capture-email.ts`, `src/features/notifications/server/back-in-stock.ts` import `@/lib/airtable`. That is a separate, later task; do not opportunistically migrate it.
- `src/lib/contentful/` and `src/lib/airtable/` are **deliberately left on disk** for the one-off migration script to read from. Nothing in the read path imports them. They get deleted after cutover.
- **Never use `@supabase/ssr`'s `createServerClient` for storefront reads.** It calls `cookies()`, and `getSiteSettings()` runs in `app/(storefront)/layout.tsx`, so one cookie read there silently opts the whole app into dynamic rendering — `revalidate = 60` and `generateStaticParams` stop working with no error. Use the plain module-scope `supabasePublic` client (`src/lib/supabase/public.ts`, `persistSession: false`). Regression check: `/products/[slug]` must stay `●` (SSG) with a `1m` revalidate in the `pnpm build` route table.
- Public images come from the `media` Storage bucket; content image columns are `*_path` (bucket object, wins) + `*_url` (legacy external fallback), resolved by `resolveImageUrl` in `src/lib/supabase/storage.ts`.
- `jsonb` columns (`colors`, `nav_links`, `social_links`, `assurances`) type as `Json`, so keep the defensive `typeof` filters when normalizing. Postgres **enum** columns (`category`, `filter_key`) need no runtime coercion — the old `toCategory()` drift guard was deleted for that reason.

See [[alesea-shop-storefront]] and [[variant-inventory]].
