-- 0013 — order_notifications: one row per email an order has been sent.
--
-- Idempotency ledger for the transactional order emails
-- (`src/features/notifications/server/order-emails.ts`). Before sending, the
-- server claims `(order_id, kind)` with INSERT … ON CONFLICT DO NOTHING; only
-- the caller whose insert returned a row sends. A failed send deletes its claim
-- so a later attempt can retry. Two concurrent status changes, a retried
-- Server Action or a double-submitted checkout therefore send each email once.
--
-- `kind` is 'placed' (buyer confirmation), 'admin_alert' (new-order alert to
-- the admins), or the order_status the buyer was told about.
--
-- Service role only. RLS is enabled with NO policies and every privilege is
-- revoked from anon/authenticated: the ledger is keyed by order id and says
-- nothing a customer or an admin page needs.
--
-- No new orders index: the per-address throttle filters on
-- `created_at >= now() - 1h` first (served by `orders_recent_idx`) and only
-- then matches the address case-insensitively, which a btree on lower(email)
-- could not serve through a PostgREST `ilike` filter anyway.

create table public.order_notifications (
  order_id uuid        not null references public.orders (id) on delete cascade,
  kind     text        not null,
  sent_at  timestamptz not null default now(),
  primary key (order_id, kind),
  constraint order_notifications_kind_check check (
    kind in (
      'placed', 'admin_alert',
      'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'
    )
  )
);

comment on table public.order_notifications is
  'Idempotency ledger for order emails. Service role only — RLS on, no policies.';

alter table public.order_notifications enable row level security;

revoke all on public.order_notifications from anon, authenticated;
