---
name: server-authoritative-order-pricing
description: Since 2026-09-06 the `place_order` RPC prices every order itself; client money fields are ignored, and discounts require a server-side promo table.
metadata:
  type: project
---

Order money is computed in Postgres, not the browser. `place_order` (migration
0010) takes `unit_price`/`currency` from `products`, shipping from
`site_settings`, derives `subtotal`/`item_count`/`total`, forces `discount` to
0, rejects unknown slugs, and aggregates duplicate `(slug, color, size)` lines.
It returns the amounts it charged; `placeOrder` surfaces them as
`result.amounts`.

**Why:** payment is cash-on-delivery, so the stored order row is the ONLY record
of what is owed. The old RPC inserted the browser's numbers verbatim, so editing
the cart in localStorage and posting `total: 1` rewrote the bill and the admin
order page rendered it as authoritative.

**How to apply:** never add a money field the client supplies and the database
stores. The checkout UI's hardcoded 10% promo code is now cosmetic — it is
discarded server-side. A real promo system means a server-side `promos` table
joined inside `place_order` on `promo_code`, not a client-computed `discount`.
Any confirmation UI should render `result.amounts`, not the cart's own totals.

Related: [[project_supabase-write-path-migration]], [[project_orders-admin]].
