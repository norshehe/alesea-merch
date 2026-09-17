import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

/**
 * Cookie-bound Supabase client for the ADMIN surface only.
 *
 * ⚠️ IMPORT BOUNDARY — only from `/admin` routes, `src/features/admin/**`,
 * `src/proxy.ts` and `src/app/auth/**`. NEVER from the storefront, and above all
 * never from `app/(storefront)/layout.tsx`. This reads `cookies()`, which opts
 * the calling tree into dynamic rendering: the storefront's `revalidate = 60`
 * and `generateStaticParams` would silently stop working with no error at all.
 * The storefront has no authenticated user — use `supabasePublic` there.
 *
 * A NEW client is created per call on purpose. `@supabase/ssr` clients carry
 * request-scoped session state, so one shared at module scope would leak a
 * session between users.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // `cookieStore.set()` THROWS when called during a Server Component
          // render — Next only allows cookie writes from Server Actions and
          // Route Handlers. Supabase calls `setAll` on every token refresh,
          // which can happen inside any admin page render, so this must not be
          // allowed to blow up the page. Swallowing it is safe because
          // `src/proxy.ts` runs on every `/admin` request and refreshes the
          // session there, where writing cookies IS allowed.
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render — proxy.ts owns the refresh.
          }
        },
      },
    },
  );
}
