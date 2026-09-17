-- Admin identity, row-level security, and the media bucket.

-- Invite-only by construction: rows here are created by hand after inviting a
-- user from the Supabase dashboard. There is deliberately no self-signup path
-- and no in-app invite UI.
create table public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text,
  created_at timestamptz not null default now()
);

create function public.is_admin() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users a where a.user_id = auth.uid())
$$;

alter table public.products        enable row level security;
alter table public.product_images  enable row level security;
alter table public.inventory       enable row level security;
alter table public.shop_categories enable row level security;
alter table public.site_settings   enable row level security;
alter table public.home_content    enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.signups         enable row level security;
alter table public.admin_users     enable row level security;

-- ---------------------------------------------------------------------------
-- Storefront: anonymous read of published content only.
-- ---------------------------------------------------------------------------

create policy products_public_read on public.products
  for select to anon, authenticated
  using (status = 'published' or public.is_admin());

create policy product_images_public_read on public.product_images
  for select to anon, authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id and (p.status = 'published' or public.is_admin())
  ));

-- Deliberately unrestricted rather than joined to published products: every
-- page calls getInventory(), so this is the hottest read path, and stock counts
-- for unpublished products are not sensitive.
create policy inventory_public_read on public.inventory
  for select to anon, authenticated using (true);

create policy shop_categories_public_read on public.shop_categories
  for select to anon, authenticated
  using (is_active or public.is_admin());

create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated using (true);

create policy home_content_public_read on public.home_content
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Admin: full control, gated on admin_users.
--
-- NOTE there is deliberately NO anon policy on orders, order_items or signups.
-- That is customer PII. With RLS enabled and no matching policy, anonymous
-- access is denied outright — so a leaked NEXT_PUBLIC_SUPABASE_ANON_KEY is not
-- an "export the customer list" button. Those tables are written only by server
-- actions running with the service-role key.
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'products', 'product_images', 'inventory', 'shop_categories',
    'site_settings', 'home_content', 'orders', 'order_items', 'signups'
  ]
  loop
    execute format(
      'create policy %I_admin_all on public.%I for all to authenticated
         using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

create policy admin_users_self_read on public.admin_users
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage.
--
-- Public bucket: getPublicUrl() returns a stable, CDN-cacheable, signature-free
-- URL, which is what next/image and ISR need. Signed URLs would expire inside a
-- 60-second-revalidated page and break images.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

create policy media_admin_write on storage.objects
  for all to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());
