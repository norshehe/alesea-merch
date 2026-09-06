import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Sign out. POST only — a GET would let any image or prefetch log the operator
 * out, and it mutates session state.
 *
 * This lives in a Route Handler because clearing the auth cookies requires
 * writing cookies, which a Server Component cannot do.
 */

/**
 * True when the POST came from this site rather than someone else's page.
 *
 * POST-only stops a prefetch or an <img>, but not a hostile page that
 * auto-submits a form at this URL — the session cookie rides along and the
 * operator is logged out mid-task. There is no CSRF token in this app, so the
 * check is on provenance:
 *
 *  * `Sec-Fetch-Site` is set by the browser and cannot be spoofed by page
 *    script. `same-origin` is the real form; `none` is a direct address-bar
 *    navigation, which a POST cannot be.
 *  * `Origin` is the fallback for anything that does not send Sec-Fetch-Site.
 *    A form POST always sends it, so a MISSING Origin with no Sec-Fetch-Site is
 *    rejected too.
 */
function isSameOriginPost(request: NextRequest): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin";

  const origin = request.headers.get("origin");
  return origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", request.nextUrl.origin), {
    // 303: turn the POST into a GET for the redirect target.
    status: 303,
  });
}
