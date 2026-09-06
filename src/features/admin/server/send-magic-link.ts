"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminLoginSchema } from "@/features/admin/schemas/login.schema";

type SendMagicLinkResult = { ok: true } | { ok: false; error: string };

/** Where the emailed link lands. Must be an allowed redirect URL in Supabase Auth. */
function confirmUrl(next?: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = new URL("/auth/confirm", site);
  if (next && next.startsWith("/")) url.searchParams.set("next", next);
  return url.toString();
}

/**
 * Email a one-time sign-in link to an admin.
 *
 * `shouldCreateUser: false` is what makes this INVITE-ONLY: Supabase will not
 * provision an account for an unknown address, so an uninvited email simply gets
 * no mail. Access is granted by creating the auth user and inserting the
 * matching `public.admin_users` row — never from this form.
 *
 * The result is identical whether or not the address exists. Reporting "no such
 * user" would turn this form into an oracle for who works here.
 */
export async function sendMagicLink(input: {
  email: string;
  next?: string;
}): Promise<SendMagicLinkResult> {
  const parsed = adminLoginSchema.safeParse({ email: input.email });
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: confirmUrl(input.next),
    },
  });

  if (error) {
    // An unknown address surfaces here as an error. Log it, but never tell the
    // browser which case it was — rate limits are the only thing worth showing.
    console.warn("[admin-auth] magic link not sent:", error.message);
    if (error.status === 429) {
      return { ok: false, error: "Too many attempts. Try again in a minute." };
    }
    return { ok: true };
  }

  return { ok: true };
}
