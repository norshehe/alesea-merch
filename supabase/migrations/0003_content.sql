-- Site settings, home page content and shop categories.
--
-- Settings and home content are singletons: `id smallint check (id = 1)` makes
-- a second row physically impossible, so reads can never pick the wrong one.
-- (Contentful's `limit: 1` was doing this by luck.) The admin upserts id = 1.
--
-- Every image is a `_path` / `_url` PAIR. The admin can upload to Storage (path)
-- or keep an external URL — HOME_FALLBACK.heroImage points at
-- lirp.cdn-website.com and must keep working. Resolution rule, applied once in
-- the client: `path ? publicUrl(path) : url`.

create table public.site_settings (
  id                  smallint primary key default 1 check (id = 1),
  title               text not null default 'Alesea Lifestyle',
  logo_path           text,
  logo_url            text,
  logo_alt            text not null default '',
  logo_width          integer not null default 0,
  logo_height         integer not null default 0,
  currency            text not null default 'PHP',
  free_ship_threshold integer not null default 2500,
  standard_shipping   integer not null default 150,
  express_shipping    integer not null default 280,
  location            text not null default '',
  footer_blurb        text not null default '',
  contact_email       text not null default '',
  contact_address     text not null default '',
  contact_social      text not null default '',
  nav_links           jsonb not null default '[]'::jsonb,
  book_now_label      text not null default '',
  book_now_url        text not null default '',
  social_links        jsonb not null default '[]'::jsonb,
  updated_at          timestamptz not null default now(),

  constraint site_settings_nav_shape check (public.is_link_array(nav_links)),
  constraint site_settings_social_shape check (public.is_link_array(social_links))
);

create trigger site_settings_touch before update on public.site_settings
  for each row execute function public.touch_updated_at();

-- Seed the singleton. Column defaults leave every text field empty, which the
-- app's per-field merge against SETTINGS_FALLBACK fills in — so an unconfigured
-- database renders exactly like today.
insert into public.site_settings (id) values (1) on conflict do nothing;

create table public.home_content (
  id                   smallint primary key default 1 check (id = 1),
  title                text not null default 'Home',

  hero_eyebrow         text not null default '',
  hero_heading         text not null default '',
  hero_body            text not null default '',
  hero_image_path      text,
  hero_image_url       text,
  hero_primary_cta     text not null default '',

  category_eyebrow     text not null default '',
  category_heading     text not null default '',
  category_body        text not null default '',

  -- [{ title, body }] — rendered as the assurance strip.
  assurances           jsonb not null default '[]'::jsonb,

  editorial_eyebrow    text not null default '',
  editorial_heading    text not null default '',
  editorial_image_path text,
  editorial_image_url  text,
  editorial_cta        text not null default '',

  carry_eyebrow        text not null default '',
  carry_heading        text not null default '',
  carry_body           text not null default '',
  carry_image_path     text,
  carry_image_url      text,

  shoreline_handle     text not null default '',
  shoreline_heading    text not null default '',
  shoreline_body       text not null default '',

  updated_at           timestamptz not null default now(),

  constraint home_assurances_shape check (public.is_assurance_array(assurances))
);

create trigger home_content_touch before update on public.home_content
  for each row execute function public.touch_updated_at();

insert into public.home_content (id) values (1) on conflict do nothing;

-- The home page's category tiles. Modelled as an ordered, activatable list
-- rather than a link table off home_content: there is exactly one home page, so
-- a join table would be the same thing with an extra join.
create table public.shop_categories (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  eyebrow    text not null default 'Collection',
  filter_key category_filter_key not null default 'all',
  image_path text,
  image_url  text,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shop_categories_order_idx on public.shop_categories (sort_order) where is_active;

create trigger shop_categories_touch before update on public.shop_categories
  for each row execute function public.touch_updated_at();
