-- Products, their images, and the sparse per-variant inventory.

-- `colors` (jsonb) and `sizes` (text[]) are stored whole rather than in child
-- tables. Their ORDER is semantically load-bearing — colors[0] is the default
-- swatch and sizes render as pills in sequence — and arrays preserve order by
-- construction. Nothing in the app ever filters or joins on them; they are read
-- whole and edited whole, which is the textbook case for jsonb. It also matches
-- ICatalogProduct exactly, so the read path needs no re-aggregation.
--
-- The cost, stated honestly: `inventory` keys off the colour NAME, so renaming
-- a colour orphans its stock rows. The trigger below blocks new drift and the
-- `inventory_orphans` view surfaces drift created by editing a product after
-- the fact. Normalizing instead would break the cart's persisted variant
-- strings in every customer's localStorage — not worth it.
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null,
  title       text not null,
  category    product_category not null,
  price       integer not null default 0 check (price >= 0),
  currency    text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  blurb       text not null default '',
  materials   text not null default '',
  size_label  text not null default 'Size',
  sizes       text[] not null default '{}',
  colors      jsonb  not null default '[]'::jsonb,
  coming_soon boolean not null default false,
  sort_order  integer not null default 0,
  status      publish_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint products_slug_key unique (slug),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint products_colors_is_array check (jsonb_typeof(colors) = 'array'),
  constraint products_colors_shape check (
    not exists (
      select 1 from jsonb_array_elements(colors) e
      where jsonb_typeof(e.value) <> 'object'
         or jsonb_typeof(e.value -> 'name') <> 'string'
         or jsonb_typeof(e.value -> 'hex') <> 'string'
         or (e.value ->> 'hex') !~ '^#[0-9A-Fa-f]{6}$'
    )
  ),
  -- Teaser products are the only ones allowed a zero price: the UI replaces
  -- price + Add to Bag with a "Notify Me" form when coming_soon is true.
  constraint products_price_or_coming_soon check (coming_soon or price > 0)
);

-- Mirrors the Contentful sort: order, then title.
create index products_browse_idx on public.products (status, sort_order, title);
create index products_category_idx on public.products (category) where status = 'published';

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- Supabase Storage returns no image dimensions (Contentful supplied them
-- automatically), so width/height live here. The admin measures them in the
-- browser at upload time; the migration reads them from Contentful metadata.
create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt          text not null default '',
  width        integer not null default 0 check (width >= 0),
  height       integer not null default 0 check (height >= 0),
  -- Array index. The first row is the PDP hero, the rest are thumbs, matching
  -- `const [hero, ...gallery] = product.images` in the UI.
  position     integer not null default 0,
  created_at   timestamptz not null default now(),

  constraint product_images_path_key unique (storage_path)
);

create index product_images_product_idx on public.product_images (product_id, position);

-- DELIBERATELY SPARSE. A variant with no row has UNKNOWN stock, which the
-- storefront reads as in-stock (never block a sale on missing data) and the
-- back-in-stock job reads as "do not email" (never promise a restock for
-- something nobody has stocked). That asymmetry is load-bearing.
--
-- DO NOT backfill a row per colour x size: it converts "unknown" into
-- "explicitly 0" and instantly sells out the entire catalogue.
--
-- Empty-string color/size mean "this product has no such axis", producing the
-- key `slug||` — exactly what variantKey() builds for variant-less products.
create table public.inventory (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color      text not null default '',
  size       text not null default '',
  sku        text,
  -- Airtable allowed negatives; nothing ever read them differently from 0
  -- (stockStatus treats <= 0 as out), so clamping here loses no information
  -- and makes the reservation path in 0005 self-guarding.
  stock      integer not null check (stock >= 0),
  updated_at timestamptz not null default now(),

  constraint inventory_variant_key unique (product_id, color, size),
  constraint inventory_sku_key unique (sku)
);

create trigger inventory_touch before update on public.inventory
  for each row execute function public.touch_updated_at();

-- Reject stock rows for options the product does not declare. This is what
-- would have caught the Weekender Tote row carrying a bottle's Clay/750ml.
create function public.inventory_options_exist() returns trigger
language plpgsql as $$
declare p record;
begin
  select sizes, colors into p from public.products where id = new.product_id;
  if not found then
    raise exception 'unknown product %', new.product_id;
  end if;

  if new.size <> '' and not (new.size = any (p.sizes)) then
    raise exception 'size "%" is not an option on this product', new.size;
  end if;

  if new.color <> '' and not exists (
    select 1 from jsonb_array_elements(p.colors) e where e.value ->> 'name' = new.color
  ) then
    raise exception 'color "%" is not an option on this product', new.color;
  end if;

  return new;
end $$;

create trigger inventory_options_exist_trg
  before insert or update on public.inventory
  for each row execute function public.inventory_options_exist();

-- Drift created by renaming a colour/size AFTER its stock rows exist. The admin
-- renders this as a warning banner; the trigger above cannot catch it because
-- the write is to `products`, not `inventory`.
create view public.inventory_orphans as
select i.*, p.slug, p.title
from public.inventory i
join public.products p on p.id = i.product_id
where (i.size <> '' and not (i.size = any (p.sizes)))
   or (i.color <> '' and not exists (
        select 1 from jsonb_array_elements(p.colors) e where e.value ->> 'name' = i.color));

-- Read shape for getInventory(): the storefront keys stock by slug, not id.
create view public.inventory_by_slug as
select p.slug, i.color, i.size, i.stock
from public.inventory i
join public.products p on p.id = i.product_id;
