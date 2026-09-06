import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Magic-link landing route — OTP verification, not the PKCE `code` exchange.
 *
 * The default Supabase magic link carries a `code` that can only be redeemed by
 * the browser holding the PKCE verifier cookie. Requesting the link on a laptop
 * and opening it on a phone therefore fails, and fails quietly. Verifying a
 * `token_hash` server-side has no such device affinity, so the link works from
 * whichever mail client the operator happens to open.
 *
 * A Route Handler is also the only place the resulting session cookies can
 * actually be written (Server Components cannot set cookies).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");

  // Only same-site relative paths — an absolute `next` would make this an open
  // redirect that lands the user on someone else's site holding a fresh session.
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/admin";

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/auth-error", origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    console.warn("[admin-auth] OTP verification failed:", error.message);
    return NextResponse.redirect(new URL("/auth-error", origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
