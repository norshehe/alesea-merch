---
name: airtable-orders
description: Checkout writes a persisted sales order to Airtable (order tracking only, no payment processing) via a Server Action with graceful degradation.
metadata:
  type: project
---

Checkout in alesea-merch persists a real sales order to Airtable on submit — order tracking only (cash-on-delivery / manual fulfillment), no payment gateway.

**Why:** The store has no auth and no payment processing; orders are fulfilled manually, so Airtable is the lightweight order ledger.

**How to apply:**
- Server-only Airtable client lives at `src/lib/airtable/index.ts` (`import "server-only"` at top): `isAirtableConfigured()` + `createAirtableRecord(fields)`. Never call it from client code; never use a `NEXT_PUBLIC_` Airtable var.
- Server Action `placeOrder` at `src/features/checkout/server/place-order.ts` (`"use server"`) owns reference generation (`generateOrderRef`) and Airtable mapping. Input type `IPlaceOrderInput`.
- Graceful degradation: if `!isAirtableConfigured()`, it warns and still returns `{ ok: true, reference }` so local/demo flows complete without env vars. Configured failures return a friendly `{ ok: false, error }` (raw error only logged).
- On `!res.ok` the cart is NOT cleared (let user retry). See [[cart-line-currency]] for per-line money formatting.
- Airtable env: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_ORDERS_TABLE` (default `Orders`).
- `server-only` package was added as a dependency (it was missing from node_modules; pnpm doesn't hoist Next's copy).
- Airtable Orders table fields: Reference, Status (single-select), Customer Name, Email, Phone, Address (long text), Delivery Method, Payment Method, Items (long text), Item Count (number), Subtotal/Shipping/Discount/Total (number), Currency. `typecast: true` auto-creates Status options.
