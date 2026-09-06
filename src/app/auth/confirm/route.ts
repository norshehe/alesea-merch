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
/**
 * The only OTP types this route will redeem.
 *
 * `type` arrives in the query string, and casting it straight to `EmailOtpType`
 * made this endpoint a redemption point for EVERY email OTP Supabase issues —
 * `recovery`, `invite` and `email_change` included. Those flows have different
 * consequences (a password reset, an accepted invite, a changed account email)
 * and none of them belongs on a link whose only job is to open the admin.
 *
 * `signInWithOtp` with `shouldCreateUser: false` (see send-magic-link.ts) can
 * only produce these two: `magiclink` for the emailed link, `email` for the
 * six-digit code form of the same grant.
 */
const ALLOWED_OTP_TYPES: readonly EmailOtpType[] = ["magiclink", "email"];

function isAllowedOtpType(value: string | null): value is EmailOtpType {
  return value !== null && ALLOWED_OTP_TYPES.includes(value as EmailOtpType);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const nextParam = searchParams.get("next");

  // Only same-site relative paths — an absolute `next` would make this an open
  // redirect that lands the user on someone else's site holding a fresh session.
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/admin";

  if (!tokenHash || !isAllowedOtpType(type)) {
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
