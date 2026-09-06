---
name: variant-inventory
description: Per-variant stock (now Supabase `inventory_by_slug`) is display + enforcement only; a missing key means IN STOCK, only an explicit 0 is out.
metadata:
  type: project
---

alesea-merch reads per-variant inventory for display + enforcement only. **Source moved from Airtable to Supabase on 2026-09-06**: `getInventory()` now lives at `src/features/catalog/server/inventory.ts` and reads the `inventory_by_slug` view. Inventory is keyed by `slug|Color|Size` and the table is SPARSE.

**Why:** Manual fulfillment store needs to block out-of-stock variants without a real commerce backend. Airtable is the lightweight stock ledger (sibling to the Orders ledger — see [[airtable-orders]]).

**How to apply:**
- Server-only reads live in `src/features/catalog/server/inventory.ts` (`import "server-only"`): `getInventory(): Promise<Map<string,number>>` keyed by `slug|Color|Size`, via `supabasePublic.from("inventory_by_slug")`. (The old `src/lib/airtable/inventory.ts` is dead code pending deletion.)
- Pure helpers (client-safe) in `src/features/catalog/lib/stock.ts`: `variantKey(slug,color,size)`, `LOW_STOCK_THRESHOLD = 5`, `stockStatus(stock?)`.
- **Critical stock semantics:** missing/undefined key ⇒ "in" (in stock); explicit `0` ⇒ "out"; `1..5` ⇒ "low"; else "in". Missing-means-available is deliberate so the store never blocks sales when the source is down or a row is absent.
- **Graceful fallback:** if the query errors or throws, `getInventory` warns `[inventory] unavailable — treating all variants as in stock` and returns an EMPTY Map. This control flow is load-bearing — never let an outage turn into a sold-out store.
- Maps are server-side; convert to plain serializable records before passing to client components. Home: `buildGridStock(products, inventory)` in `src/features/catalog/lib/build-grid-stock.ts` → per-product `{ soldOut }` keyed by product id → `ProductGrid`/`ProductCard`. PDP: slice to a `{ "slug|Color|Size": stock }` record → `product-detail.tsx`.
- UI affordances: PDP disables Add-to-bag + "Out of stock" label when selected variant is out, "Only N left" for low, line-through+opacity on out-of-stock sizes for the current colour. Card shows "Sold out" + disables quick-add only when the WHOLE product is sold out (card stays a link to PDP). Add handler no-ops with toast "That option just sold out" if stock is 0.
- Inventory read added to existing `revalidate = 60` on home + PDP so stock edits surface within ~a minute.
