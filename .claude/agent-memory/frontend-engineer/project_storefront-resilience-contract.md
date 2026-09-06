---
name: storefront-resilience-contract
description: Storefront read path rules — data reads throw (never return []/undefined on error) because ISR caches successful renders; presentational content and inventory degrade to defaults instead.
metadata:
  type: project
---

The storefront splits its Supabase reads into two classes, and the class decides
the failure behaviour:

- **Catalog reads throw.** `getCatalog()` / `getProduct()` must let query errors
  propagate. Returning `[]` or `undefined` is a *successful* render of an empty
  grid or a `notFound()`, and under `revalidate = 60` that gets written into the
  ISR cache and served to everyone — a transient blip becomes a cached 404.
  `undefined` is reserved for a confirmed zero-row result. `src/app/(storefront)/error.tsx`
  is the other half of this contract.
- **Chrome, editorial copy and inventory degrade.** `getSiteSettings()`,
  `getHomeContent()` fall back to their `*_FALLBACK` constants and
  `getInventory()` returns an empty Map (⇒ everything reads as in stock) when
  Supabase is unreachable *or unconfigured*.

`src/lib/supabase/public.ts` is therefore lazy (`getSupabasePublic()` +
`isSupabaseConfigured()`): supabase-js throws on a falsy URL, and every read
client imports it at module scope, so an eager client turned one missing env var
into a boot-time crash of the whole site.

**Why:** found in the pre-deploy review of 2026-09-06 — swallowed errors were
silently poisoning the ISR cache, and a missing env var took down the storefront
at module load.

**How to apply:** when adding a storefront data getter, decide which class it is
first. Never wrap a catalog-shaped read in a try/catch that returns an empty
value. See also [[supabase-read-path-migration]].
