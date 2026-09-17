import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` and the exported function
 * from `middleware` to `proxy`. A file named `middleware.ts` is IGNORED — the
 * app would run with no session refresh and no auth gate, silently. The `edge`
 * runtime is not supported here; `proxy` always runs on Node.
 *
 * Two jobs, in this order:
 *   1. Refresh the Supabase session and write the rotated tokens onto the
 *      OUTGOING response. Server Components cannot set cookies, so this is the
 *      only place a refresh can be persisted.
 *   2. An OPTIMISTIC auth redirect. This only proves a valid Supabase user
 *      exists — NOT that they are an admin. `requireAdmin()` in
 *      `src/features/admin/server/auth.ts` is the authoritative check.
 */
export async function proxy(request: NextRequest) {
  // Everything below mutates THIS response object; it must be the one returned,
  // otherwise refreshed cookies are dropped and the user is logged out at random.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Write to the REQUEST too, so anything reading cookies later in this
          // same request (the rendered page) sees the refreshed tokens rather
          // than the stale ones.
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // Supabase hands us no-store cache headers with the first cookie
          // write; a CDN caching a Set-Cookie response would hand one user's
          // session to another.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // getUser(), NEVER getSession(). `getSession` returns whatever is in the
  // cookie without verifying it against the auth server, so a forged cookie
  // would pass. `getUser` revalidates the JWT with Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

/**
 * Scoped to admin surfaces ONLY. A broad matcher would put a network round trip
 * to Supabase Auth in front of every storefront request, including the ISR-cached
 * ones — which is both slow and pointless, as the storefront has no users.
 */
export const config = {
  matcher: ["/admin/:path*", "/login"],
};
