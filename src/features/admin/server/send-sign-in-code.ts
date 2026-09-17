"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminLoginSchema } from "@/features/admin/schemas/login.schema";

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
 * no mail. Access is granted by creating the auth user and inserting the
 * matching `public.admin_users` row — never from this form.
 *
 * The result is identical whether or not the address exists. Reporting "no such
 * user" would turn this form into an oracle for who works here.
 */
export async function sendSignInCode(input: {
  email: string;
}): Promise<SendSignInCodeResult> {
  const parsed = adminLoginSchema.safeParse({ email: input.email });
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false },
  });

  if (error) {
    // An unknown address surfaces here as an error. Log it, but never tell the
    // browser which case it was — rate limits are the only thing worth showing.
    console.warn("[admin-auth] sign-in code not sent:", error.message);
    if (error.status === 429) {
      return { ok: false, error: "Too many attempts. Try again in a minute." };
    }
    return { ok: true };
  }

  return { ok: true };
}
