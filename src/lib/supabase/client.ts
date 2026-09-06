"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

/**
 * Cookie-bound Supabase client for the browser, ADMIN surface only.
 *
 * ⚠️ IMPORT BOUNDARY — only from admin client components under
 * `src/features/admin/**` or `/admin` routes. The storefront has no
 * authenticated user and must keep reading through `supabasePublic`; pulling an
 * auth client into a storefront component drags the auth/session machinery into
 * the public bundle and encourages cookie reads that break static rendering.
 *
 * `createBrowserClient` memoizes internally, so calling this per component is
 * cheap and does not create duplicate GoTrue instances.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
}
