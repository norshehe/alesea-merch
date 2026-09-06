-- The status trigger could not run for the role that actually uses it.
--
-- 0007 revoked EXECUTE on apply_order_stock from anon/authenticated so it could
-- not be called over /rest/v1/rpc. But sync_order_stock was SECURITY INVOKER,
-- so when an admin (the `authenticated` role) cancelled an order the trigger
-- body executed as that role and hit the very revoke — failing the whole
-- UPDATE with "permission denied for function apply_order_stock".
--
-- place_order was unaffected because it is SECURITY DEFINER and runs as the
-- owner, which is why placing an order worked while cancelling one did not.
-- Testing via the SQL editor also masked it: that runs as `postgres`.
--
-- Making the trigger SECURITY DEFINER runs its body as the owner, so stock
-- follows the order's status regardless of which admin moved it — the intent.
-- Trigger functions are not reachable over PostgREST, so this widens no API
-- surface. search_path stays pinned and every reference is schema-qualified.
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
    perform public.apply_order_stock(new.id, -1);
    new.stock_reserved := true;
  end if;
  return new;
end $$;
