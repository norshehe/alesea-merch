-- Server-side pricing, symmetric stock accounting, and two storage hardenings.
--
-- Four defects, all with the same shape: the database trusted something it had
-- no business trusting — the browser's arithmetic, or its own `greatest(0, …)`
-- clamp standing in for an availability check.
--
--   1. place_order inserted the CLIENT's unit_price / subtotal / total. Payment
--      is cash-on-delivery, so that row is the only record of what was owed:
--      editing the cart in localStorage and posting `total: 1` rewrote the bill
--      and the admin order page rendered it as authoritative.
--   2. sync_order_stock re-reserved on un-cancel with no availability check,
--      and apply_order_stock clamps at 0 — so cancel → sell out → reinstate →
--      cancel again MINTED stock that never existed.
--   3. Two cart lines for the same variant were checked against stock
--      independently and then both decremented. The cart UI dedupes, but the
--      RPC is the transaction boundary and must enforce its own contract.
--   4. Deleting an order stranded its reservation — no BEFORE DELETE trigger.
--
-- Nothing here is destructive: functions are replaced, one policy is narrowed,
-- one bucket's MIME allowlist loses SVG. No table or row is touched.

-- ---------------------------------------------------------------------------
-- 1. Availability check, shared by placement and re-reservation.
--
-- Aggregates the order's lines by variant first, so a duplicated variant is
-- checked against the SUM it will actually take rather than line by line.
-- Rows are locked FOR UPDATE in a stable (product, color, size) order so two
-- concurrent callers queue instead of deadlocking.
--
-- Sparse-inventory rule is preserved exactly: a variant with NO inventory row
-- has UNKNOWN stock and is always allowed through. Only an explicit row can
-- reject.
-- ---------------------------------------------------------------------------
create function public.assert_order_stock_available(p_order_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  it      record;
  v_stock integer;
begin
  for it in
    select oi.product_id,
           oi.color,
           oi.size,
           sum(oi.quantity)::int as quantity,
           min(oi.name)          as name
      from public.order_items oi
     where oi.order_id = p_order_id
       and oi.product_id is not null
     group by oi.product_id, oi.color, oi.size
     order by oi.product_id, oi.color, oi.size
  loop
    select i.stock into v_stock
      from public.inventory i
     where i.product_id = it.product_id
       and i.color = it.color
       and i.size = it.size
     for update;

    if found and v_stock < it.quantity then
      raise exception 'OUT_OF_STOCK:%', it.name
        using errcode = 'check_violation';
    end if;
  end loop;
end $$;

comment on function public.assert_order_stock_available(uuid) is
  'Raises OUT_OF_STOCK:<name> when an order''s lines, aggregated by variant, exceed an EXPLICIT inventory row. Variants with no row are unknown stock and always pass.';

-- ---------------------------------------------------------------------------
-- 2. place_order — the database prices the order.
--
-- Every money column is now derived here from `products` and `site_settings`.
-- The client's unit_price / line_total / subtotal / shipping / discount /
-- total / currency / item_count are IGNORED outright; the browser sends what it
-- wants to buy, not what it wants to pay. The action returns the computed
-- amounts so the UI can show what was actually charged.
--
-- Return type gains columns, so the function has to be dropped rather than
-- replaced — which means re-applying 0007's revoke at the bottom of this file.
-- ---------------------------------------------------------------------------
drop function public.place_order(jsonb, jsonb);

create function public.place_order(p_order jsonb, p_items jsonb)
returns table (
  order_id   uuid,
  reference  text,
  item_count integer,
  subtotal   integer,
  shipping   integer,
  discount   integer,
  total      integer,
  currency   text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id        uuid;
  v_ref       text;
  v_missing   text;
  v_currencies integer;
  v_currency  text;
  v_items     integer;
  v_subtotal  integer;
  v_shipping  integer;
  -- No promo system exists yet. The client sends a `discount` (the checkout UI
  -- has a hardcoded 10% demo code) and it is deliberately discarded: a discount
  -- the customer can name is a discount the customer can invent. When promos
  -- become real they belong in a server-side `promos` table joined here on
  -- p_order ->> 'promo_code', with the amount computed from that row.
  v_discount  constant integer := 0;
  v_total     integer;
  v_method    text := coalesce(nullif(p_order ->> 'delivery_method', ''), 'standard');
  v_free      integer;
  v_std       integer;
  v_exp       integer;
  it          record;
  i           integer := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'INVALID_ORDER: no items' using errcode = 'check_violation';
  end if;

  -- Reject an unknown slug outright. Previously this silently inserted a line
  -- with product_id = null, a client-supplied name and a client-supplied price
  -- — an order for a product that does not exist, at whatever price was asked.
  select string_agg(distinct r.slug, ', ') into v_missing
    from (
      select coalesce(e ->> 'slug', '') as slug
        from jsonb_array_elements(p_items) e
    ) r
    left join public.products p on p.slug = r.slug
   where p.id is null;

  if v_missing is not null then
    raise exception 'INVALID_ORDER: unknown product(s) %', v_missing
      using errcode = 'check_violation';
  end if;

  -- Quantities are clamped to >= 1 here as well as in the server action's Zod
  -- parse: this function is the transaction boundary and cannot assume a
  -- caller validated anything.
  with req as (
    select coalesce(e ->> 'slug', '')                        as slug,
           coalesce(e ->> 'color', '')                       as color,
           coalesce(e ->> 'size', '')                        as size,
           greatest(1, coalesce((e ->> 'quantity')::int, 1)) as quantity
      from jsonb_array_elements(p_items) e
  ),
  agg as (
    select slug, color, size, sum(quantity)::int as quantity
      from req
     group by slug, color, size
  )
  select count(distinct p.currency)::int,
         min(p.currency),
         sum(a.quantity)::int,
         sum(p.price * a.quantity)::int
    into v_currencies, v_currency, v_items, v_subtotal
    from agg a
    join public.products p on p.slug = a.slug;

  -- One order, one currency. Nothing in the app can build a mixed bag today,
  -- but the totals below would be meaningless if it could.
  if v_currencies > 1 then
    raise exception 'INVALID_ORDER: mixed currencies' using errcode = 'check_violation';
  end if;

  -- Shipping from settings, applying the SAME rule the storefront shows the
  -- customer (src/features/checkout/components/checkout-view.tsx): express is a
  -- flat rate, standard is free at or above the threshold. The `> 0 else
  -- default` guards mirror num() in src/features/catalog/server/settings.ts, so
  -- a zeroed settings row falls back to the same numbers the UI renders.
  select case when s.free_ship_threshold > 0 then s.free_ship_threshold else 2500 end,
         case when s.standard_shipping   > 0 then s.standard_shipping   else 150  end,
         case when s.express_shipping    > 0 then s.express_shipping    else 280  end
    into v_free, v_std, v_exp
    from public.site_settings s
   where s.id = 1;

  v_free := coalesce(v_free, 2500);
  v_std  := coalesce(v_std, 150);
  v_exp  := coalesce(v_exp, 280);

  v_shipping := case
    when v_method = 'express' then v_exp
    when v_subtotal >= v_free then 0
    else v_std
  end;

  v_total := v_subtotal + v_shipping - v_discount;

  insert into public.orders (
    customer_name, email, phone,
    address_line1, address_line2, city, province, postal_code, country,
    delivery_method, delivery_label, payment_method,
    item_count, subtotal, shipping, discount, total, currency, promo_code,
    stock_reserved
  ) values (
    p_order ->> 'customer_name', p_order ->> 'email', coalesce(p_order ->> 'phone', ''),
    p_order ->> 'address_line1', coalesce(p_order ->> 'address_line2', ''),
    p_order ->> 'city', p_order ->> 'province', p_order ->> 'postal_code',
    coalesce(p_order ->> 'country', 'Philippines'),
    v_method, p_order ->> 'delivery_label', p_order ->> 'payment_method',
    v_items, v_subtotal, v_shipping, v_discount, v_total,
    coalesce(v_currency, 'PHP'),
    p_order ->> 'promo_code',
    true
  ) returning public.orders.id, public.orders.reference into v_id, v_ref;

  -- Lines, aggregated by variant so a duplicated variant becomes ONE row taking
  -- its combined quantity once. name and variant_label are derived from the
  -- product and the variant axes rather than echoed from the request: the
  -- snapshot has to be what we sold, not what the browser said we sold.
  for it in
    with req as (
      select coalesce(e ->> 'slug', '')                        as slug,
             coalesce(e ->> 'color', '')                       as color,
             coalesce(e ->> 'size', '')                        as size,
             greatest(1, coalesce((e ->> 'quantity')::int, 1)) as quantity
        from jsonb_array_elements(p_items) e
    ),
    agg as (
      select slug, color, size, sum(quantity)::int as quantity
        from req
       group by slug, color, size
    )
    select a.slug, a.color, a.size, a.quantity,
           p.id as product_id, p.title, p.price
      from agg a
      join public.products p on p.slug = a.slug
     order by a.slug, a.color, a.size
  loop
    insert into public.order_items (
      order_id, product_id, slug, name, color, size,
      variant_label, quantity, unit_price, line_total, position
    ) values (
      v_id, it.product_id, it.slug, it.title, it.color, it.size,
      case
        when it.color <> '' and it.size <> '' then it.color || ' · ' || it.size
        when it.color <> '' then it.color
        else it.size
      end,
      it.quantity, it.price, it.price * it.quantity, i
    );

    i := i + 1;
  end loop;

  -- Check availability across the whole (aggregated) order, then reserve.
  perform public.assert_order_stock_available(v_id);
  perform public.apply_order_stock(v_id, -1);

  return query select v_id, v_ref, v_items, v_subtotal, v_shipping,
                      v_discount, v_total, coalesce(v_currency, 'PHP');
end $$;

comment on function public.place_order(jsonb, jsonb) is
  'Places an order. Prices every line from public.products and shipping from public.site_settings — the caller''s money fields are ignored. Returns the amounts actually charged.';

-- ---------------------------------------------------------------------------
-- 3. Re-reservation must check availability.
--
-- The old branch called apply_order_stock(id, -1) unconditionally, and that
-- helper clamps with greatest(0, …). Stock 5 → order 5 → cancel (+5) → someone
-- else buys 5 (0) → reinstate: greatest(0, 0 - 5) = 0, but stock_reserved was
-- set true anyway → cancel again → +5. Five units created from nothing.
--
-- Raising instead makes the release symmetric with what was actually taken: an
-- order can only be reinstated if the goods are genuinely there. The admin sees
-- the message via updateOrderStatus's plain-error path.
--
-- Stays SECURITY DEFINER (0009): the body calls apply_order_stock, whose
-- EXECUTE was revoked from `authenticated` in 0007, so an admin's UPDATE would
-- otherwise fail with "permission denied for function".
-- ---------------------------------------------------------------------------
create or replace function public.sync_order_stock() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_released boolean := old.status in ('cancelled', 'refunded');
  is_released  boolean := new.status in ('cancelled', 'refunded');
begin
  if not was_released and is_released and old.stock_reserved then
    perform public.apply_order_stock(new.id, 1);
    new.stock_reserved := false;
  elsif was_released and not is_released and not old.stock_reserved then
    perform public.assert_order_stock_available(new.id);
    perform public.apply_order_stock(new.id, -1);
    new.stock_reserved := true;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Deleting an order releases its reservation.
--
-- order_items cascades on delete, but referential actions run after the row is
-- gone — a BEFORE DELETE trigger still sees the lines, which is the only window
-- in which the stock can be given back. Without this, deleting a pending order
-- stranded its stock permanently.
-- ---------------------------------------------------------------------------
create function public.release_order_stock_on_delete() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.stock_reserved then
    perform public.apply_order_stock(old.id, 1);
  end if;
  return old;
end $$;

create trigger orders_release_stock_on_delete
  before delete on public.orders
  for each row execute function public.release_order_stock_on_delete();

-- ---------------------------------------------------------------------------
-- 5. Re-apply 0007's revokes.
--
-- Dropping place_order dropped its ACL with it, and a newly created function
-- grants EXECUTE to PUBLIC by default — which would republish it at
-- /rest/v1/rpc/place_order for anyone holding the anon key. The new helper gets
-- the same treatment; both are only ever reached through the service-role
-- client or from inside a trigger.
-- ---------------------------------------------------------------------------
revoke all on function public.place_order(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.assert_order_stock_available(uuid) from public, anon, authenticated;
revoke all on function public.release_order_stock_on_delete() from public, anon, authenticated;

-- 0009 made sync_order_stock SECURITY DEFINER without narrowing its ACL, which
-- the advisor flags as an anon-executable definer function. PostgREST will not
-- actually expose a function returning `trigger`, so this is belt-and-braces —
-- but the trigger machinery does not consult EXECUTE, so revoking costs nothing
-- and clears the finding.
revoke all on function public.sync_order_stock() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Storage: stop anon listing the bucket.
--
-- `media_public_read` granting anon SELECT on storage.objects is what makes
-- POST /storage/v1/object/list/media work with the public anon key — an
-- enumerable index of every uploaded file, including imagery for `draft`
-- products that have not been announced. Public object URLs do not depend on
-- this policy: they are served because the bucket itself is `public = true`.
-- ---------------------------------------------------------------------------
drop policy media_public_read on storage.objects;

create policy media_public_read on storage.objects
  for select to authenticated
  using (bucket_id = 'media');

-- SVG is not an image as far as a browser is concerned — it is a document that
-- can carry <script>. Storage serves the stored content type, so an uploaded
-- SVG executes on the Supabase origin, with access to that origin's storage.
-- Nothing in the app uploads or renders SVG assets.
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
 where id = 'media';
