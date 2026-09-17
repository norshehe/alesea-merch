---
name: supabase-write-path-migration
description: Write path (orders, signups, back-in-stock stamps) moved off Airtable to Supabase service-role client on 2026-09-06; Airtable/Contentful code deleted.
metadata:
  type: project
---

Since 2026-09-06 both read and write paths are on Supabase. `src/lib/airtable/` and `src/lib/contentful/` are deleted, and the `contentful` / `@contentful/rich-text-react-renderer` deps are removed.

**Why:** Airtable was a stopgap. Orders now need atomic stock reservation, which only a DB transaction can give — the `place_order(p_order jsonb, p_items jsonb)` RPC inserts order + items and reserves stock in one call, and generates the order reference itself (the old `generateOrderRef()` used `Math.random()` with no uniqueness guarantee).

**How to apply:**
- All writes go through `src/lib/supabase/admin.ts` (`supabaseAdmin`, service-role, `import "server-only"`). RLS gives `anon` no policy at all on `orders`, `order_items`, `signups`, and `place_order` has EXECUTE revoked from anon — deliberate, so a leaked public key cannot export the customer list. Never import `admin.ts` from anything without `"use server"` / `server-only`.
- Reads stay on `supabasePublic` (anon) — see [[supabase-read-path-migration]].
- `place_order` raises `OUT_OF_STOCK:<product name>` with SQLSTATE `23514` when an *explicit* stock row is insufficient; a variant with no stock row is fail-open. `createOrder` surfaces this as `{ ok: false, outOfStock }` rather than throwing.
- `signups` has a unique index on `(lower(email), source)` — an *expression* index, so `ON CONFLICT` / PostgREST `upsert` cannot target it. Repeat signups are handled by inserting and swallowing SQLSTATE `23505`. Never upsert here: overwriting the row would reset `notified_at` and re-send a back-in-stock email.
- `AIRTABLE_*` / `CONTENTFUL_*` env vars are intentionally still in `.env`/`.env.example` until after cutover.
