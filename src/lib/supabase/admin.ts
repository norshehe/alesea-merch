import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role Supabase client — BYPASSES ROW LEVEL SECURITY.
 *
 * `orders`, `order_items` and `signups` grant `anon` no policy at all, so a
 * leaked public key cannot export the customer list; `place_order` likewise has
 * EXECUTE revoked from anon/authenticated. Every write in this app therefore has
 * to come through this client.
 *
 * `server-only` is load-bearing: it makes importing this module from a client
 * component a build error, which is the one thing standing between the service
 * role key and a public bundle.
 *
 * `persistSession` / `autoRefreshToken` are off for the same reason as
 * `supabasePublic` — module scope on the server must not carry auth state
 * between requests.
 */
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

/** True when every env var the service-role client needs is present. */
export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
