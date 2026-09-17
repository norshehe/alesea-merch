-- Move the admin check into a non-exposed schema and split the read policies by
-- role. Resolves three linter findings at once:
--   * anon/authenticated could execute public.is_admin() over /rest/v1/rpc
--   * auth.uid() was re-evaluated per row in admin_users_self_read
--   * every content table had two permissive SELECT policies for `authenticated`

create schema if not exists private;
grant usage on schema private to authenticated;

-- PostgREST only exposes functions in `public`, so a helper here is reachable
-- from SQL (including RLS policy evaluation) but NOT over the REST API.
-- auth.uid() is wrapped in a SELECT so it is evaluated once per query rather
-- than once per row.
create function private.is_admin() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = (select auth.uid())
  )
$$;

drop policy products_public_read on public.products;
drop policy product_images_public_read on public.product_images;
drop policy inventory_public_read on public.inventory;
drop policy shop_categories_public_read on public.shop_categories;
drop policy site_settings_public_read on public.site_settings;
drop policy home_content_public_read on public.home_content;
drop policy admin_users_self_read on public.admin_users;
drop policy media_public_read on storage.objects;
drop policy media_admin_write on storage.objects;

do $$
declare t text;
begin
  foreach t in array array[
    'products', 'product_images', 'inventory', 'shop_categories',
    'site_settings', 'home_content', 'orders', 'order_items', 'signups'
  ]
  loop
    execute format('drop policy %I_admin_all on public.%I', t, t);
  end loop;
end $$;

drop function public.is_admin();

-- Storefront reads are ALWAYS anonymous: the public client uses the anon key
-- with persistSession false and never carries a session. Scoping these to
-- `anon` alone removes the duplicate-permissive-policy overlap on
-- `authenticated` AND drops the is_admin() call from the hottest read path.
create policy products_public_read on public.products
  for select to anon using (status = 'published');

create policy product_images_public_read on public.product_images
  for select to anon
  using (exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'published'
  ));

create policy inventory_public_read on public.inventory
  for select to anon using (true);

create policy shop_categories_public_read on public.shop_categories
  for select to anon using (is_active);

create policy site_settings_public_read on public.site_settings
  for select to anon using (true);

create policy home_content_public_read on public.home_content
  for select to anon using (true);

-- Admins are the only authenticated users this app has.
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
         using ((select private.is_admin())) with check ((select private.is_admin()))',
      t, t);
  end loop;
end $$;

create policy admin_users_self_read on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

create policy media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

create policy media_admin_write on storage.objects
  for all to authenticated
  using (bucket_id = 'media' and (select private.is_admin()))
  with check (bucket_id = 'media' and (select private.is_admin()));
