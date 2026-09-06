-- Extensions, enums and shared helpers.
--
-- Native enums replace the application-level `toCategory()` coercion, which
-- silently defaulted unknown categories to "tees" with a warning. Here an
-- invalid category is rejected at write time, so content drift is impossible.

create extension if not exists "pgcrypto";

-- Storefront product categories. Mirrors CatalogCategory in
-- src/features/catalog/types.ts — keep the two in sync.
create type product_category as enum ('tees', 'bags', 'caps', 'tumblers');

-- Home page category tiles filter on a superset: they can point at a category
-- that is not a product category ("accessories") or at everything ("all").
-- Deliberately a separate type from product_category; do not merge them.
create type category_filter_key as enum (
  'tees', 'bags', 'caps', 'tumblers', 'accessories', 'all'
);

-- Replaces the dead `available` boolean from the Contentful model. Contentful's
-- Delivery API only served published entries; this restores that gate.
create type publish_status as enum ('draft', 'published');

-- Orders are requests until an admin accepts them (no payment is processed).
-- `pending` reserves stock; `cancelled` returns it. See 0005_orders.sql.
create type order_status as enum (
  'pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'
);

-- `set search_path = ''` on every function: Supabase's security advisor flags
-- a mutable search_path as a privilege-escalation vector. All object
-- references below are therefore schema-qualified.
create function public.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Shape guard for the {label, href} arrays used by nav and social links.
create function public.is_link_array(v jsonb) returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(v) = 'array' and not exists (
    select 1 from jsonb_array_elements(v) e
    where jsonb_typeof(e.value -> 'label') <> 'string'
       or jsonb_typeof(e.value -> 'href') <> 'string'
  )
$$;
