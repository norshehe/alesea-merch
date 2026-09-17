import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Storefront (anon) Supabase client — read-only public data.
 *
 * DELIBERATELY NOT `@supabase/ssr`'s `createServerClient`.
 * That variant needs `cookies()`, and `getSiteSettings()` runs in
 * `app/(storefront)/layout.tsx`, so a single `cookies()` call there would opt the
 * whole storefront into dynamic rendering — silently killing `revalidate = 60`
 * and `generateStaticParams`. Nothing would error; the site would just stop being
 * static. There is no authenticated storefront user, so cookies buy us nothing.
 *
 * DELIBERATELY LAZY. `createClient` throws `"supabaseUrl is required."` on a
 * falsy URL, and this module is imported at module scope by every read client —
 * which the root layout pulls in. Constructing eagerly would turn one missing env
 * var into a boot-time crash for the entire site. Behind a getter, the same
 * misconfiguration degrades: content readers fall back to their design defaults
 * and `getInventory()` returns an empty map (⇒ everything reads as in stock),
 * mirroring the pre-migration behaviour.
 *
 * `persistSession` / `autoRefreshToken` are off because this client is cached at
 * module scope on the server: it must never carry auth state between requests.
 */

let cached: SupabaseClient<Database> | null = null;

/** True when every env var the anon client needs is present. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * The shared anon client. Throws a descriptive error when unconfigured — call
 * {@link isSupabaseConfigured} first anywhere a missing config should degrade
 * rather than surface as a failed render.
 */
export function getSupabasePublic(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  cached ??= createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
