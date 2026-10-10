"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminLoginSchema } from "@/features/admin/schemas/login.schema";
import { provisionInvitedUser } from "@/features/admin/users/server/invitations";

type SendSignInCodeResult = { ok: true } | { ok: false; error: string };

/**
 * Email a one-time sign-in code to an admin.
 *
 * CODE ONLY — no `emailRedirectTo`, and the Supabase template must render
 * `{{ .Token }}` and NOT `{{ .ConfirmationURL }}`.
 *
 * One `signInWithOtp` call issues a SINGLE grant redeemable either by typing
 * the code or by following a link. Shipping both in one email is worse than
 * shipping only the link: a mail scanner that prefetches the URL spends the
 * grant, and then the code the recipient is staring at fails too. So the link
 * is gone, and `/auth/confirm` with it — a URL that mints an admin session is
 * exactly what a prefetching scanner turns into a lockout.
 *
 * Losing the link also makes sign-in independent of Supabase's Site URL and
 * redirect allow-list, which is where the production link was pointing at
 * localhost.
 *
 * `shouldCreateUser: false` is what makes this INVITE-ONLY: Supabase will not
 * provision an account for an unknown address, so an uninvited email simply gets
 * no mail. Invitations from `/admin/users` work WITHOUT loosening that:
 * `provisionInvitedUser` creates the auth user first, and only when an open,
 * unexpired invitation names this address. Admin access itself is granted later,
 * by `verifyAdminOtp`, once the code proves they own the mailbox.
 *
 * The ANSWER is identical whether or not the address exists or is invited —
 * reporting "no such user" would turn this form into an oracle for who works
 * here. The timing is not: an invited address costs an extra lookup and a
 * user creation, which a patient attacker could measure. Accepted, because it
 * only distinguishes addresses an admin has just chosen to invite.
 */
export async function sendSignInCode(input: {
  email: string;
}): Promise<SendSignInCodeResult> {
  const parsed = adminLoginSchema.safeParse({ email: input.email });
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email." };
  }

  // Never throws and reports nothing, so it cannot change the response below.
  await provisionInvitedUser(parsed.data.email);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false },
  });

  if (error) {
    // An unknown address surfaces here as an error. Log it, but never tell the
    // browser which case it was.
    console.warn("[admin-auth] sign-in code not sent:", error.message);
    // Only the PER-IP limit is shown. The per-address limit
    // (`over_email_send_rate_limit`) can only trip for an address that HAS an
    // auth user — an unknown one is refused before any mail is attempted — so
    // surfacing it would answer "does this address exist?" after two tries.
    // Matched on the code, not `status === 429`, because both limits are 429s.
    // The login form already words success as "if this address has access…",
    // so a swallowed per-address limit reads true to a real admin too.
    if (error.code === "over_request_rate_limit") {
      return { ok: false, error: "Too many attempts. Try again in a minute." };
    }
    return { ok: true };
  }

  return { ok: true };
}
