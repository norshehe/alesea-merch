-- Orders, line items, and the stock reservation model.
--
-- No payment is processed — an order is a REQUEST until an admin accepts it.
-- So stock is reserved when the order is placed and settled when its status
-- changes: accepting keeps the reservation, cancelling returns the goods.
--
-- All of it commits atomically, which is exactly what Airtable could not do and
-- why the previous implementation had no stock handling at all.

-- Order references. `nextval * odd` mod 32^5 is a bijection over the range
-- (32^5 = 2^25, and any odd multiplier is coprime with it), so references are
-- collision-free by construction for the first ~33M orders while not looking
-- sequential to a customer. The old generateOrderRef() was 5 random base36
-- characters with no uniqueness check at all.
create sequence public.order_ref_seq;

create function public.next_order_ref() returns text
language plpgsql
set search_path = ''
as $$
declare
  n        bigint := (nextval('public.order_ref_seq') * 2654435761) % 33554432;
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';  -- Crockford: no I, L, O, U
  ref      text := '';
begin
  for _ in 1..5 loop
    ref := substr(alphabet, (n % 32)::int + 1, 1) || ref;
    n := n / 32;
  end loop;
  return 'ALS-' || ref;
end $$;

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null default public.next_order_ref(),
  status          order_status not null default 'pending',

  customer_name   text not null,
  email           text not null,
  phone           text not null default '',

  -- Structured, unlike the Airtable version which flattened all of this into a
  -- single newline-joined string. IPlaceOrderInput already carried the parts.
  address_line1   text not null,
  address_line2   text not null default '',
  city            text not null,
  province        text not null,
  postal_code     text not null,
  country         text not null default 'Philippines',

  delivery_method text not null,   -- machine key, e.g. "standard"
  delivery_label  text not null,   -- human label as shown at checkout
  payment_method  text not null,

  -- Whole pesos, matching formatPrice() and the rest of the app. Do not switch
  -- to centavos without changing every price computation in cart/checkout.
  item_count      integer not null check (item_count >= 0),
  subtotal        integer not null check (subtotal >= 0),
  shipping        integer not null check (shipping >= 0),
  discount        integer not null default 0 check (discount >= 0),
  total           integer not null check (total >= 0),
  currency        text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  promo_code      text,

  -- True while this order is holding stock. Tracked explicitly rather than
  -- inferred from status, so releasing and re-reserving can never double-apply.
  stock_reserved  boolean not null default false,

  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint orders_reference_key unique (reference)
);

create index orders_recent_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_email_idx on public.orders (lower(email));

create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  -- Nullable with ON DELETE SET NULL: deleting a product must never destroy
  -- order history. The snapshot columns below are the durable record.
  product_id    uuid references public.products(id) on delete set null,
  slug          text not null default '',
  -- Snapshots, never joins: an order records what the customer actually paid,
  -- forever, even after the product is repriced or renamed.
  name          text not null,
  color         text not null default '',
  size          text not null default '',
  variant_label text not null default '',   -- "Beige · M", as displayed
  quantity      integer not null check (quantity > 0),
  unit_price    integer not null check (unit_price >= 0),
  line_total    integer not null check (line_total >= 0),
  position      integer not null default 0
);

create index order_items_order_idx on public.order_items (order_id, position);
create index order_items_product_idx on public.order_items (product_id);

-- Apply a stock delta for every line of an order.
--   direction = -1  reserve (placing / reactivating)
--   direction = +1  release (cancelling / refunding)
--
-- Only rows that already exist are touched. A variant with no inventory row has
-- UNKNOWN stock and must never be reserved, rejected, or brought into existence
-- here — that would convert "unknown" into "explicitly counted" and break the
-- fail-open rule the whole storefront depends on.
create function public.apply_order_stock(p_order_id uuid, p_direction integer)
returns void
language plpgsql
set search_path = ''
as $$
declare it record;
begin
  for it in
    select product_id, color, size, quantity
    from public.order_items
    where order_id = p_order_id and product_id is not null
  loop
    update public.inventory
       set stock = greatest(0, stock + (p_direction * it.quantity))
     where product_id = it.product_id
       and color = it.color
       and size = it.size;
  end loop;
end $$;

-- Place an order: insert it, insert its lines, reserve stock — atomically.
--
-- Raises OUT_OF_STOCK:<name> if a variant has an EXPLICIT stock row with
-- insufficient quantity. Variants with no row are always allowed through.
create function public.place_order(p_order jsonb, p_items jsonb)
returns table (order_id uuid, reference text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id    uuid;
  v_ref   text;
  it      jsonb;
  i       integer := 0;
  v_pid   uuid;
  v_stock integer;
begin
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
    p_order ->> 'delivery_method', p_order ->> 'delivery_label', p_order ->> 'payment_method',
    (p_order ->> 'item_count')::int, (p_order ->> 'subtotal')::int,
    (p_order ->> 'shipping')::int, coalesce((p_order ->> 'discount')::int, 0),
    (p_order ->> 'total')::int, coalesce(p_order ->> 'currency', 'PHP'),
    p_order ->> 'promo_code',
    true
  ) returning public.orders.id, public.orders.reference into v_id, v_ref;

  for it in select * from jsonb_array_elements(p_items) loop
    select p.id into v_pid from public.products p where p.slug = it ->> 'slug';

    insert into public.order_items (
      order_id, product_id, slug, name, color, size,
      variant_label, quantity, unit_price, line_total, position
    ) values (
      v_id, v_pid, coalesce(it ->> 'slug', ''), it ->> 'name',
      coalesce(it ->> 'color', ''), coalesce(it ->> 'size', ''),
      coalesce(it ->> 'variant_label', ''), (it ->> 'quantity')::int,
      (it ->> 'unit_price')::int, (it ->> 'line_total')::int, i
    );

    if v_pid is not null then
      -- Lock the row so two concurrent checkouts cannot both pass the check.
      select stock into v_stock
        from public.inventory
       where product_id = v_pid
         and color = coalesce(it ->> 'color', '')
         and size = coalesce(it ->> 'size', '')
       for update;

      -- Not found => unknown stock => allowed through, nothing to reserve.
      if found and v_stock < (it ->> 'quantity')::int then
        raise exception 'OUT_OF_STOCK:%', it ->> 'name'
          using errcode = 'check_violation';
      end if;
    end if;

    i := i + 1;
  end loop;

  perform public.apply_order_stock(v_id, -1);

  return query select v_id, v_ref;
end $$;

-- Settle the reservation when an admin moves the order.
--   → cancelled / refunded : return the goods to sale
--   → back to an active status : take them again
-- Accepting a pending order changes nothing: the reservation simply becomes the
-- sale.
create function public.sync_order_stock() returns trigger
language plpgsql
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
    perform public.apply_order_stock(new.id, -1);
    new.stock_reserved := true;
  end if;
  return new;
end $$;

create trigger orders_sync_stock
  before update of status on public.orders
  for each row
  when (old.status is distinct from new.status)
  execute function public.sync_order_stock();
