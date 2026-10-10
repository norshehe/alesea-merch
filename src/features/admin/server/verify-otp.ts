"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  adminLoginSchema,
  adminOtpSchema,
} from "@/features/admin/schemas/login.schema";
import { acceptInvitation } from "@/features/admin/users/server/invitations";

type VerifyOtpResult = { ok: true; next: string } | { ok: false; error: string };

/**
 * Exchange a typed sign-in code for a session.
 *
 * The ONLY way into the admin. There was a `/auth/confirm` route that redeemed
 * the `token_hash` from a clicked link; it is gone, because a URL that mints an
 * admin session is what a prefetching mail scanner turns into a lockout (see
 * the comment on `adminOtpSchema`).
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

  // Only same-site relative paths. `next` arrives from the query string, so an
  // absolute value would let someone hand a colleague a /login?next=… that
  // lands them on another origin holding a freshly minted session.
  const next =
    input.next && input.next.startsWith("/") && !input.next.startsWith("//")
      ? input.next
      : "/admin";

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
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

  // First sign-in of an invitee: the code has just proven they own the mailbox,
  // which is the moment an open invitation may become an `admin_users` row.
  // For everyone else this is a no-op. It never fails the sign-in — a user it
  // could not promote lands on `/not-authorized`, exactly like an uninvited one.
  if (data.user) {
    await acceptInvitation(data.user.id, data.user.email ?? email.data.email);
  }

  return { ok: true, next };
}
