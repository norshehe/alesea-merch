import "server-only";
import { headers } from "next/headers";
import { isSupabaseAdminConfigured, supabaseAdmin } from "@/lib/supabase/admin";
import { isSendGridConfigured, sendEmail } from "@/lib/sendgrid";
import { buildInvitationEmail } from "@/features/admin/users/lib/invitation-email";

/**
 * The invitation plumbing shared by the sign-in actions and `/admin/users`.
 *
 * Everything here uses the SERVICE-ROLE client. `admin_invitations` has no write
 * policies at all, and the sign-in path runs before the caller has a session,
 * so the cookie-bound client could not see an invite even if it wanted to.
 *
 * NO EMAIL ADDRESS IS LOGGED. Who has been invited to the admin is exactly the
 * kind of fact the sign-in form refuses to disclose; writing it to Vercel's logs
 * would disclose it to everyone on the project. Invitation ids are logged
 * instead.
 */

/** Auth API codes that mean "this address already has an auth user". */
const ALREADY_EXISTS_CODES = new Set(["email_exists", "user_already_exists"]);

/**
 * Make sure an invited address has an auth user BEFORE a code is requested.
 *
 * `signInWithOtp({ shouldCreateUser: false })` is what keeps sign-in
 * invite-only, and it stays that way: rather than loosening it, the invited
 * user is created here, ahead of time, from the invitation. An address with no
 * open invite gets nothing, exactly as before.
 *
 * `email_confirm: true` matters. An UNCONFIRMED user is sent Supabase's
 * "Confirm signup" template, which carries a confirmation URL — a link a mail
 * scanner would spend. A confirmed user gets the code-only sign-in template.
 *
 * Never throws and returns nothing: the caller's response must be identical
 * whether or not the address was invited, so there is nothing to report.
 */
export async function provisionInvitedUser(rawEmail: string): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;

  const email = rawEmail.trim().toLowerCase();

  try {
    const { data: invite, error } = await supabaseAdmin
      .from("admin_invitations")
      .select("id")
      .eq("email", email)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("[admin-invite] invite lookup failed:", error.message);
      return;
    }
    if (!invite) return;

    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
      });

    // "Already exists" is the normal second-time case (they asked for a code
    // before, or the account predates the invite) — the OTP goes out either way.
    if (createError) {
      if (!ALREADY_EXISTS_CODES.has(createError.code ?? "")) {
        console.error(
          `[admin-invite] could not create auth user for invitation ${invite.id}:`,
          createError.message,
        );
      }
      return;
    }

    // A revoke that landed between the lookup and the create would not have
    // seen this user (`revoke_admin_invitation` looks for the orphan at revoke
    // time), so it would outlive the invite. Re-check, and undo our own create.
    // Only a user created HERE is deleted — never a pre-existing account.
    const { data: stillOpen, error: recheckError } = await supabaseAdmin
      .from("admin_invitations")
      .select("id")
      .eq("id", invite.id)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .maybeSingle();
    if (recheckError) {
      console.error(
        `[admin-invite] re-check failed for invitation ${invite.id}:`,
        recheckError.message,
      );
      return;
    }
    if (!stillOpen && created.user) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        created.user.id,
      );
      if (deleteError) {
        console.error(
          `[admin-invite] invitation ${invite.id} was revoked mid-sign-in; could not delete user ${created.user.id}:`,
          deleteError.message,
        );
      }
    }
  } catch (error) {
    console.error("[admin-invite] provisioning failed:", error);
  }
}

/**
 * Turn a just-verified sign-in into an admin, if an open invite says so.
 *
 * `accept_admin_invitation` does the work atomically and re-checks that the
 * auth user's email IS the invited address. Failure is swallowed on purpose: a
 * user who could not be promoted lands on `/not-authorized`, which is the same
 * place an uninvited user lands, so nothing about the invite leaks.
 *
 * Returns true only when THIS call consumed an invitation, so `/not-authorized`
 * can send a freshly promoted user on to `/admin`. Never throws.
 */
export async function acceptInvitation(
  userId: string,
  email: string,
): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return false;

  try {
    const { data, error } = await supabaseAdmin.rpc("accept_admin_invitation", {
      p_user_id: userId,
      p_email: email.trim().toLowerCase(),
    });
    if (error) {
      console.error(`[admin-invite] accept failed for user ${userId}:`, error.message);
      return false;
    }
    return data === true;
  } catch (error) {
    console.error(`[admin-invite] accept failed for user ${userId}:`, error);
    return false;
  }
}

/**
 * The origin the `/login` link in the email points at.
 *
 * `NEXT_PUBLIC_SITE_URL` when set — the canonical host. In development only,
 * the host this request arrived on. In PRODUCTION an unset variable returns
 * null and the email is not sent: Host / X-Forwarded-Host are request input,
 * and a spoofed one would put an attacker's "sign-in page" in a real invite.
 * There is deliberately no hard-coded fallback either: alesea.co is the resort
 * site, not this app, and a link there would be a dead end.
 */
async function siteOrigin(): Promise<string | null> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured;

  if (process.env.NODE_ENV === "production") {
    console.error(
      "[admin-invite] NEXT_PUBLIC_SITE_URL is not set; invitation emails are disabled until it is.",
    );
    return null;
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host ?? "localhost:3000"}`;
}

export interface ISendInvitationInput {
  invitationId: string;
  email: string;
  name: string | null;
  inviterName: string;
  expiresAt: Date;
}

/**
 * Email an invitation and stamp `last_sent_at` on success.
 *
 * Returns whether it was sent rather than throwing: the invitation is valid
 * either way — the invitee can sign in with their email whether or not this
 * mail arrives — so a SendGrid outage downgrades to "tell them yourself"
 * instead of failing the invite.
 */
export async function sendInvitationEmail({
  invitationId,
  email,
  name,
  inviterName,
  expiresAt,
}: ISendInvitationInput): Promise<boolean> {
  if (!isSendGridConfigured()) return false;

  const siteUrl = await siteOrigin();
  if (!siteUrl) return false;

  try {
    const message = buildInvitationEmail({
      email,
      name,
      inviterName,
      siteUrl,
      expiresAt,
    });
    await sendEmail({ to: email, ...message });
  } catch (error) {
    console.error(`[admin-invite] send failed for invitation ${invitationId}:`, error);
    return false;
  }

  const { error } = await supabaseAdmin
    .from("admin_invitations")
    .update({ last_sent_at: new Date().toISOString() })
    .eq("id", invitationId);
  if (error) {
    // The mail went out; only the bookkeeping failed. Not worth failing for.
    console.error(
      `[admin-invite] could not stamp last_sent_at on ${invitationId}:`,
      error.message,
    );
  }

  return true;
}
