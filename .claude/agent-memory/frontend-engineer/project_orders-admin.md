---
name: orders-admin
description: Orders admin is read + status only; the DB trigger owns stock movement and the UI only explains it.
metadata:
  type: project
---

The `/admin/orders` surface is READ + STATUS ONLY. There is no create, and amounts, addresses and line items are never editable — only `status` and `notes`. Line items render from the `order_items` snapshot (`name`, `unit_price`), never from a join to `products`.

Stock movement on a status change belongs to the `sync_order_stock` trigger (`supabase/migrations/0005_orders.sql`): into `cancelled`/`refunded` returns stock, back out takes it again, every other transition moves nothing. TypeScript must never re-implement that arithmetic — `src/features/admin/orders/lib/order-status.ts` only mirrors the trigger's IF conditions to write a one-line consequence, and the action reports what happened by re-reading `stock_reserved`.

**Why:** two sources of truth for stock is how variants silently go unbuyable; the trigger holds the lock and runs in the same transaction.

**How to apply:** when extending orders, add explanation, not calculation. Revalidate storefront products only on a transition that crosses the cancelled/refunded boundary — notes and fulfilment-only moves change nothing a customer can see. Related: [[airtable-inventory]], [[supabase-write-path-migration]].
