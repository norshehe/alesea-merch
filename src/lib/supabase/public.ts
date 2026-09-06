import { createClient } from "@supabase/supabase-js";
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
 * `persistSession` / `autoRefreshToken` are off because this client lives at
 * module scope on the server: it must never carry auth state between requests.
 */
export const supabasePublic = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
