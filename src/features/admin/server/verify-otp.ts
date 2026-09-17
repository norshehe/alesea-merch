"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  adminLoginSchema,
  adminOtpSchema,
} from "@/features/admin/schemas/login.schema";

type VerifyOtpResult = { ok: true; next: string } | { ok: false; error: string };

/**
 * Exchange a typed sign-in code for a session.
 *
 * The counterpart to `/auth/confirm`, which redeems the `token_hash` from a
 * clicked link. Both end at `verifyOtp`; this one exists because the link half
 * cannot survive a mail scanner that prefetches URLs (see the code comment on
 * `adminOtpSchema`).
 *
 * A Server Action rather than a Route Handler because the browser already has
 * the code — there is no navigation to intercept — and an action can write the
 * session cookies on its own response.
 *
 * `type: "email"` is the typed-code form of the same grant `signInWithOtp`
 * issued; `"magiclink"` is the link form and only accepts a `token_hash`.
 */
export async function verifyAdminOtp(input: {
  email: string;
  token: string;
  next?: string;
}): Promise<VerifyOtpResult> {
  const email = adminLoginSchema.safeParse({ email: input.email });
  const token = adminOtpSchema.safeParse({ token: input.token });

  if (!email.success || !token.success) {
    // Deliberately vague: the form validates both fields before it gets here,
    // so reaching this branch means a hand-made request, not a typo.
    return { ok: false, error: "That code is not valid." };
  }

  // Same rule as `/auth/confirm`: only same-site relative paths, or an attacker
  // could hand someone a login link that lands them on another origin holding a
  // freshly minted session.
  const next =
    input.next && input.next.startsWith("/") && !input.next.startsWith("//")
      ? input.next
      : "/admin";

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    email: email.data.email,
    token: token.data.token,
    type: "email",
  });

  if (error) {
    console.warn("[admin-auth] code verification failed:", error.message);
    if (error.status === 429) {
      return { ok: false, error: "Too many attempts. Try again in a minute." };
    }
    // Every other failure — wrong digits, expired, already used, unknown
    // address — gets one message. Distinguishing them would say whether the
    // address has admin access, which the request step is careful not to leak.
    return {
      ok: false,
      error: "That code didn't work. It expires quickly and works only once.",
    };
  }

  return { ok: true, next };
}
