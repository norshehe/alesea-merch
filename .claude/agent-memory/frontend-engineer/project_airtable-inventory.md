---
name: airtable-inventory
description: Per-variant stock is read from Airtable (Inventory table) for display + enforcement only; missing key means in stock, only explicit 0 is out.
metadata:
  type: project
---

alesea-merch reads per-variant inventory from Airtable for display + enforcement only (no auto-decrement). Products come from Contentful; inventory is keyed by `slug|Color|Size`.

**Why:** Manual fulfillment store needs to block out-of-stock variants without a real commerce backend. Airtable is the lightweight stock ledger (sibling to the Orders ledger — see [[airtable-orders]]).

**How to apply:**
- Server-only reads live in `src/lib/airtable/inventory.ts` (`import "server-only"`): `getInventory(): Promise<Map<string,number>>` keyed by `slug|Color|Size`. Reads the literal `Inventory` table (NOT `AIRTABLE_ORDERS_TABLE`), env `AIRTABLE_API_KEY` + `AIRTABLE_BASE_ID`, paginates via `offset`. Never `NEXT_PUBLIC_`.
- Pure helpers (client-safe) in `src/features/catalog/lib/stock.ts`: `variantKey(slug,color,size)`, `LOW_STOCK_THRESHOLD = 5`, `stockStatus(stock?)`.
- **Critical stock semantics:** missing/undefined key ⇒ "in" (in stock); explicit `0` ⇒ "out"; `1..5` ⇒ "low"; else "in". Missing-means-available is deliberate so the store never blocks sales when Airtable is down or a row is absent.
- **Graceful fallback:** if not configured OR fetch throws, `getInventory` warns `[inventory] unavailable — treating all variants as in stock` and returns an EMPTY Map. Verified: a 403 from Airtable does not break `pnpm run build`.
- Maps are server-side; convert to plain serializable records before passing to client components. Home: `buildGridStock(products, inventory)` in `src/features/catalog/lib/build-grid-stock.ts` → per-product `{ soldOut }` keyed by product id → `ProductGrid`/`ProductCard`. PDP: slice to a `{ "slug|Color|Size": stock }` record → `product-detail.tsx`.
- UI affordances: PDP disables Add-to-bag + "Out of stock" label when selected variant is out, "Only N left" for low, line-through+opacity on out-of-stock sizes for the current colour. Card shows "Sold out" + disables quick-add only when the WHOLE product is sold out (card stays a link to PDP). Add handler no-ops with toast "That option just sold out" if stock is 0.
- Inventory read added to existing `revalidate = 60` on home + PDP so Airtable edits surface within ~a minute.
