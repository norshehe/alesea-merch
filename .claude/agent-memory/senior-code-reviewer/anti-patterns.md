---
name: anti-patterns
description: Recurring anti-patterns to flag in alesea-merch reviews (fail-open data fallbacks, per-field merge asymmetry, dead admin surfaces, duplicated action boilerplate, stale post-migration comments)
metadata:
  type: project
---

Recurring issues seen in alesea-merch review work. Check for these each review.

> **Stack note (2026-09-06):** the app migrated OFF Contentful + Airtable onto Supabase Postgres/Storage/Auth, with a new `/admin`. Several older entries below were written pre-migration and are marked RESOLVED — keep them only as patterns to watch for, not as current facts.

**Fail-open vs fail-closed inventory is the load-bearing invariant.** `inventory` is SPARSE: no row = UNKNOWN stock. Storefront must read unknown as IN stock (`stockStatus(undefined) === "in"`, `getInventory()` returns an empty Map on error); the back-in-stock job must read unknown as DO-NOT-EMAIL (requires `typeof value === "number"`); the admin grid must DELETE the row when a cell is cleared, never write 0.
**Why:** a backfilled zero sells out the whole catalogue; an emailed "back in stock" for a never-stocked variant is a broken promise to a customer.
**How to apply:** on any change to `features/catalog/lib/{stock,build-grid-stock}.ts`, `features/catalog/server/inventory.ts`, `features/notifications/server/back-in-stock.ts`, `features/admin/inventory/**`, or `supabase/migrations/0002`/`0005`, re-derive both halves. Also check every consumer collapses an EMPTY axis to `[""]` / `[{name:""}]` before keying — `buildGridStock` does, `products/[slug]/page.tsx` does NOT (its `for (color of product.colors) for (size of product.sizes)` skips variant-less products entirely, so an explicit 0 on e.g. the Weekender Tote never blocks its PDP).

**Fallback removed on one path but not the other → a transient error becomes a cached 404.** `getProduct()` catches, returns `undefined`, and the page calls `notFound()` under `revalidate = 60` — so one Supabase blip bakes a 404 into ISR for everyone. Same shape: `getCatalog()` returning `[]` caches an empty grid AND makes `generateStaticParams` return `[]`.
**Why:** the pre-migration version fell back to a hardcoded catalog, so a data-source blip was invisible. Dropping the fallback (deliberately, per `catalog.ts`'s docblock) changed the failure mode without changing the caller.
**How to apply:** whenever a server data getter swallows an error into a falsy/empty value, follow it to the caller. If the caller does `notFound()`, redirects, or renders an empty state *inside a cached route*, the swallow must become a rethrow so the error boundary fires and ISR keeps serving the last good render.

**Per-field fallback merging is asymmetric across the three server modules — don't assume uniformity.** `server/settings.ts` and `server/home.ts` merge remote-over-default PER FIELD (blank restores the default); `server/catalog.ts` has NO fallback at all. In settings, `num()` requires `> 0`, so 0 is unrepresentable — an admin can never set free shipping / a 0 shipping rate. The admin forms correctly read rows RAW (no merge) so a save can't freeze today's copy into the DB — verify any new admin form keeps that.

**A whole admin surface can be wired to content nothing renders.** `/admin/categories` (page + form + actions + queries + `shop_categories` table + `category_filter_key` enum), plus the home form's "Category section" fields and `IHomeContent.category*`/`categories`, edit content NO storefront component reads — the home page dropped its category section. Its `revalidatePath("/")` is a no-op in effect.
**How to apply:** for every admin field/tab/route, grep the storefront for a consumer of the field it writes. An operator editing invisible content and seeing nothing change is worse than a missing feature.

**Cache invalidation via `revalidatePath` only — check the second argument.** A dynamic segment needs `revalidatePath("/products/[slug]", "page")` (silently no-ops without it); a literal `/products/my-slug` is fine as-is. Anything rendered by the root layout (header/footer/settings/currency) needs `revalidatePath("/", "layout")`. `features/admin/server/revalidate.ts` centralises this, but `settings.actions.ts` and `home.actions.ts` bypass it "to stay self-contained" — that is the duplication the module exists to prevent.

**Server-action boilerplate copy-pasted six times.** `ActionResult`, `IPostgresError`, `isPostgresError`, `firstIssue` and a bespoke `toMessage` are duplicated verbatim across all six `features/admin/*/server/*.actions.ts`. Only the Postgres-code→sentence mapping is genuinely per-feature. Flag new actions files that add a seventh copy; the shared parts belong in `features/admin/server/action-result.ts`.

**Two near-identical components instead of one parameterised one.** `orders/components/order-search.tsx` and `signups/components/signup-search.tsx` differ only in label strings and an imported status type. Same for the `IPostgresError` cluster above. Watch for a third copy appearing with the next admin list page.

**PostgREST's implicit 1000-row cap on "select everything and count in JS".** `countOrdersByStatus()` (`select("status")`) and the dashboard's `from("inventory").select("stock")` tally in memory and silently under-report past 1000 rows. Use `count: "exact", head: true` with a filter instead.

**Stale post-migration comments outlive the code by a wide margin.** ~20 files still say "Contentful"/"Airtable" in docblocks describing Supabase reads — including `features/catalog/types.ts` (which still calls `ICatalogProduct` a temporary local-catalog shape and points at the RETIRED `contentful-domain-scaffolder`), both storefront layout/page `revalidate` comments, and the cron route ("reads live Airtable data"). `.env.example` still lists 9 dead Contentful/Airtable vars. `docs/CONTENTFUL_CHANGES.md` still instructs editors to change values in Contentful.
**How to apply:** grep `Contentful|Airtable` on every review until it is clean; a wrong comment on a data-layer file is worse than no comment.

**Env vars read at module scope with `?? ""` turn a missing var into a boot crash.** `lib/supabase/public.ts` passes `?? ""` to `createClient`, and supabase-js throws `supabaseUrl is required.` on a falsy URL — and that module is imported transitively by the storefront layout. Contrast `isSupabaseAdminConfigured()`, which degrades. Flag any module-scope client construction without a configured-guard.

**Hardcoded project/infrastructure identifiers in config.** `next.config.ts` pins one Supabase project ref in `images.remotePatterns` while URLs are built from `NEXT_PUBLIC_SUPABASE_URL` — point the env at a branch/local project and every `next/image` 400s. Derive the hostname from the env var.

**`server-only` is missing on the read-path Supabase clients.** `lib/supabase/public.ts` and the three `*Client.ts` read modules lack it. The boundary holds today only because every caller in `features/catalog/server/*` has it. Note the exception: `lib/supabase/storage.ts` and `types/common.ts` are pure and MUST stay client-importable (`image-upload-field.tsx` uses `publicUrl`).

**Two `cn` implementations in one codebase.** 11 files in `components/ui/` import `cn` from `@/lib/utils` (clsx + tailwind-merge); 6 newer ones (`tabs`, `alert-dialog`, `switch`, `table`, `checkbox`, `textarea`) import it from the `cn` npm package. Both are legitimate, but shipping both is pointless. Pick one.

**Base UI (NOT Radix) — `Select`/`Switch`/`Checkbox` need `<Controller>`.** `register()` on them silently yields empty values, and there is no `asChild` (it is `render={...}`). The admin forms get this right today; check every new one.

---

### RESOLVED (kept as patterns to watch for)

- ~~**Contentful data layer bypassed by local constants.**~~ RESOLVED — Supabase is now the single product source; `features/catalog/constants/products.ts` is down to presentation constants. Note the flip side: React Query is now entirely dead (`QueryProvider` wraps the storefront with zero `useQuery` calls, `@tanstack/react-query` still a dependency), and CLAUDE.md's "`*Handler.ts` + `*Keys` factory" convention no longer describes the code.
- ~~**Cart lines carry no `currency`.**~~ RESOLVED — `cart.store.ts` now copies `product.currency` onto each line and cart/drawer/checkout format lines with `line.currency`. Residual: SUBTOTALS still use the global `useSettings().currency`, and `place_order` stores one order-level `currency`, so a genuinely mixed-currency bag would total wrongly. PHP-only today.
- **`accessories` filterKey has no home in `CatalogCategory`.** Still true but now intentional and enforced: `0001_extensions_enums.sql` declares `product_category` and `category_filter_key` as separate enums with a comment saying not to merge them. The coerce-to-tees drift is gone (native enum). Moot anyway while the category section renders nowhere.
- **Hardcoded product slugs / coming-soon copy in layout chrome.** Still present: `site-footer.tsx` uses `WEEKENDER_TOTE_SLUG`. A slug rename in the admin now 404s the footer link with nothing to catch it.
- **Orphaned home-section components after page edits.** Still the live cause of the dead category surface above.
- **Conditional React hooks after an early return.** Build-breaking (`react-hooks/rules-of-hooks` is an error). Flag as Major, not Minor.
- **`toImage`/`next/image` and zero dimensions.** Shape carried over to Supabase: `site_settings.logo_width/height` default to `0`, `toImage` returns a truthy `IImage` with `width: 0`, and `site-header.tsx` gates the logo on `logo?.width` — so an admin who sets a logo without dimensions silently gets the text wordmark and no error.
- **Zustand-persist hydration: only SiteHeader guards it.** Unchanged.
