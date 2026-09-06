-- Revoke API access to the functions that must never be called from a browser.
--
-- Supabase exposes every function in `public` over PostgREST at
-- /rest/v1/rpc/<name>. The anon key ships in the client bundle, so anything
-- left executable there is effectively a public endpoint.

-- place_order is SECURITY DEFINER (it writes orders and inventory, which have
-- no anon policies). Left exposed, anyone holding the public anon key could
-- POST /rest/v1/rpc/place_order to fabricate orders and drain stock counts.
-- It is only ever called by the placeOrder server action using the service-role
-- key, which bypasses these grants entirely.
revoke all on function public.place_order(jsonb, jsonb) from public, anon, authenticated;

-- Stock mutation helper: RLS already blocks anon writes to inventory, but there
-- is no reason for it to be reachable over the API at all.
revoke all on function public.apply_order_stock(uuid, integer) from public, anon, authenticated;

-- Burning sequence values from outside serves no purpose.
revoke all on function public.next_order_ref() from public, anon, authenticated;

-- NOTE: public.is_admin() intentionally remains EXECUTE-able. RLS policy
-- expressions are evaluated as the calling role, so anon and authenticated must
-- be able to execute it or products_public_read and friends would fail. Called
-- directly it returns false for a non-admin and leaks nothing. Supabase's
-- linter still flags it; that warning is expected and accepted.
comment on function public.is_admin() is
  'Admin check for RLS policies. Must stay EXECUTE-able by anon/authenticated because policies are evaluated as the calling role; returns false for non-admins.';
