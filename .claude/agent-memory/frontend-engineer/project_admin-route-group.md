---
name: admin-route-group
description: Storefront and admin live in sibling route groups with two root layouts; part of a Track B migration toward a Supabase-backed /admin.
metadata:
  type: project
---

`src/app/` has no root `layout.tsx`. Instead `(storefront)/layout.tsx` (async, `revalidate = 60`, fetches site settings, renders header/footer/cart/providers) and `(admin)/layout.tsx` (`force-dynamic`, no data fetching, `noindex`, `body.admin-theme`) are two independent root layouts. Fonts are shared from `@/lib/fonts`; `globals.css`, `icon.png`, `providers/`, `api/` stay at `src/app/`.

**Why:** Track B Phase 0 (2026-09-06) of an approved migration plan — an `/admin` section needs to exist without the storefront chrome or its Contentful fetch. Phase 0 was an explicit pure refactor: zero URL changes, zero visual changes, no Supabase code yet.

**How to apply:** New storefront pages go under `src/app/(storefront)/` (route groups do not affect URLs). Admin pages go under `src/app/(admin)/admin/`. Never re-introduce `src/app/layout.tsx` — it would break the two-root-layout setup. Admin UI should use the neutral shadcn tokens; `.admin-theme` in `globals.css` overrides `--primary`/`--ring` to brand teal, unlike the storefront which uses the [[brand-system]] custom brand classes.
