"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/admin/server/auth";
import { adminDisplayName } from "@/features/admin/users/lib/format";
import {
  firstIssue,
  toActionMessage,
  type ActionResult,
} from "@/features/admin/server/action-result";
import {
  INVITATION_TTL_DAYS,
  inviteAdminSchema,
  recordIdSchema,
  type InviteAdminFormValues,
} from "@/features/admin/users/schemas/invitation.schema";
import { sendInvitationEmail } from "@/features/admin/users/server/invitations";
import { isSupabaseAdminConfigured, supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Write path for admins and invitations.
 *
 * Every export starts with `requireAdmin()` and re-parses its input: the
 * client schema is a UX affordance, not a security boundary.
 *
 * Writes use the SERVICE-ROLE client, unlike the rest of the admin. That is
 * forced, not chosen: `admin_invitations` deliberately has no write policies,
 * the guarded removal and the revoke are service-role-only functions, and
 * deleting an auth user is an Auth admin API call. So `requireAdmin()` is the
 * ONLY gate in front of these writes — it must stay the first line of each.
 *
 * "Self" is always the session's admin from `requireAdmin()`, never an id the
 * browser sent: a client that could say who it is could remove anyone.
 *
 * All admins are equal — there are no roles to check beyond "is an admin".
 */

const USERS_PATH = "/admin/users";

const CONSTRAINT_MESSAGES = {
  admin_invitations_open_email_key: "That email already has an open invitation.",
  admin_invitations_email_normalised: "Enter a valid email.",
};

const SERVICE_ROLE_MISSING =
  "Admin management needs SUPABASE_SERVICE_ROLE_KEY on the server, and it is not set.";

function inviteExpiry(): Date {
  return new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** What the inviter is told when the email did not go out. */
const NOT_EMAILED_NOTICE =
  "The invitation is saved, but the email could not be sent. Let them know to sign in at /login with this email address — they'll be emailed a code.";

export type InvitationSendResult = ActionResult<{
  emailed: boolean;
  /** Set when `emailed` is false: what the admin should do instead. */
  notice?: string;
}>;

/** Create an invitation and email it. */
export async function inviteAdmin(
  values: InviteAdminFormValues,
): Promise<InvitationSendResult> {
  const admin = await requireAdmin();

  const parsed = inviteAdminSchema.safeParse(values);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: firstIssue(parsed.error.issues),
      field: typeof issue?.path[0] === "string" ? issue.path[0] : undefined,
    };
  }
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: SERVICE_ROLE_MISSING };
  }

  const { email, name } = parsed.data;

  try {
    // `admin_users.email` predates the normalisation rule and may carry the
    // casing it was typed with, so the comparison happens here rather than as
    // an `eq` that would miss `Ana@…`. The list is a handful of rows.
    const { data: admins, error: adminsError } = await supabaseAdmin
      .from("admin_users")
      .select("email");
    if (adminsError) throw adminsError;
    if ((admins ?? []).some((row) => row.email.trim().toLowerCase() === email)) {
      return { ok: false, error: "That person is already an admin.", field: "email" };
    }

    const { data: open, error: openError } = await supabaseAdmin
      .from("admin_invitations")
      .select("id")
      .eq("email", email)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .maybeSingle();
    if (openError) throw openError;
    if (open) {
      return {
        ok: false,
        error: "That email already has an open invitation — use Resend on it below.",
        field: "email",
      };
    }

    const expiresAt = inviteExpiry();
    // The unique index is the real guard against a concurrent double-invite;
    // the check above only exists to give the common case a clearer message.
    const { data: invite, error: insertError } = await supabaseAdmin
      .from("admin_invitations")
      .insert({
        email,
        name: name || null,
        invited_by: admin.id,
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();
    if (insertError) {
      if (insertError.message.includes("admin_invitations_open_email_key")) {
        return {
          ok: false,
          error: CONSTRAINT_MESSAGES.admin_invitations_open_email_key,
          field: "email",
        };
      }
      throw insertError;
    }

    const emailed = await sendInvitationEmail({
      invitationId: invite.id,
      email,
      name: name || null,
      inviterName: adminDisplayName(admin),
      expiresAt,
    });

    revalidatePath(USERS_PATH);
    return emailed ? { ok: true, emailed } : { ok: true, emailed, notice: NOT_EMAILED_NOTICE };
  } catch (error) {
    console.error("[admin-users] invite failed", error);
    return {
      ok: false,
      error: toActionMessage(error, "Could not create the invitation.", CONSTRAINT_MESSAGES),
    };
  }
}

/**
 * Re-send an open invitation and give it a fresh expiry.
 *
 * Works on an EXPIRED invite too — that is the main reason to press it — so the
 * filter is "still open", not "still valid".
 */
export async function resendInvitation(id: string): Promise<InvitationSendResult> {
  const admin = await requireAdmin();

  const parsedId = recordIdSchema.safeParse(id);
  if (!parsedId.success) {
    return { ok: false, error: firstIssue(parsedId.error.issues) };
  }
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: SERVICE_ROLE_MISSING };
  }

  try {
    const expiresAt = inviteExpiry();
    // `.select()` is not decoration: PostgREST reports no error when an UPDATE
    // matches nothing, and an invitation accepted or revoked in another tab is
    // exactly that.
    const { data, error } = await supabaseAdmin
      .from("admin_invitations")
      .update({ expires_at: expiresAt.toISOString() })
      .eq("id", parsedId.data)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .select("id, email, name");
    if (error) throw error;

    const invite = data?.[0];
    if (!invite) {
      revalidatePath(USERS_PATH);
      return {
        ok: false,
        error: "That invitation is no longer open — it was accepted or revoked. Reload the list.",
      };
    }

    const emailed = await sendInvitationEmail({
      invitationId: invite.id,
      email: invite.email,
      name: invite.name,
      inviterName: adminDisplayName(admin),
      expiresAt,
    });

    revalidatePath(USERS_PATH);
    return emailed ? { ok: true, emailed } : { ok: true, emailed, notice: NOT_EMAILED_NOTICE };
  } catch (error) {
    console.error("[admin-users] resend failed", error);
    return {
      ok: false,
      error: toActionMessage(error, "Could not resend the invitation."),
    };
  }
}

/**
 * Revoke an open invitation.
 *
 * If the invitee already asked for a code, `provisionInvitedUser` created an
 * auth user for them. Left behind, that user could keep requesting codes and
 * reach `/not-authorized` — harmless, but an account that should not exist.
 * `revoke_admin_invitation` returns its id only when it never became an admin,
 * and it is deleted here. Best effort: the invite is already revoked, which is
 * what actually withholds access.
 */
export async function revokeInvitation(id: string): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = recordIdSchema.safeParse(id);
  if (!parsedId.success) {
    return { ok: false, error: firstIssue(parsedId.error.issues) };
  }
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: SERVICE_ROLE_MISSING };
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("revoke_admin_invitation", {
      p_invitation_id: parsedId.data,
    });
    if (error) throw error;

    const outcome = data?.[0];
    if (!outcome?.revoked) {
      revalidatePath(USERS_PATH);
      return {
        ok: false,
        error: "That invitation is no longer open — it was accepted or revoked. Reload the list.",
      };
    }

    // Typed `string` by the generator, but the function returns NULL when no
    // orphan exists. Normalised here so nothing below can mistake "" or null
    // for an id.
    const orphanUserId: string | null = outcome.orphan_user_id || null;
    if (orphanUserId) {
      const { error: deleteError } =
        await supabaseAdmin.auth.admin.deleteUser(orphanUserId);
      if (deleteError) {
        console.error(
          `[admin-users] revoked invitation ${parsedId.data} but could not delete its auth user:`,
          deleteError.message,
        );
      }
    }

    revalidatePath(USERS_PATH);
    return { ok: true };
  } catch (error) {
    console.error("[admin-users] revoke failed", error);
    return {
      ok: false,
      error: toActionMessage(error, "Could not revoke the invitation."),
    };
  }
}

/**
 * Remove another admin.
 *
 * Two guards, in two places:
 * - Self: here, against the SESSION's id. Removing yourself is never what you
 *   meant from this screen, and it would strand the last admin trivially.
 * - Last admin: in `remove_admin_user`, under a table lock, because two admins
 *   removing each other at once would both pass an app-side count.
 *
 * Then the auth user is deleted. Dropping the `admin_users` row already denies
 * access on their next request, but their sessions would live on until expiry;
 * deleting the user kills every session and leaves no dormant account that can
 * still request codes. Re-inviting works either way. If only that second step
 * fails, they are still out — so the result is a success that says so, not an
 * error.
 */
export async function removeAdmin(
  userId: string,
): Promise<ActionResult<{ sessionsEnded: boolean }>> {
  const admin = await requireAdmin();

  const parsedId = recordIdSchema.safeParse(userId);
  if (!parsedId.success) {
    return { ok: false, error: firstIssue(parsedId.error.issues) };
  }
  if (parsedId.data === admin.id) {
    return { ok: false, error: "You can't remove yourself. Ask another admin to do it." };
  }
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: SERVICE_ROLE_MISSING };
  }

  try {
    const { data: outcome, error } = await supabaseAdmin.rpc("remove_admin_user", {
      p_user_id: parsedId.data,
    });
    if (error) throw error;

    if (outcome === "not_found") {
      revalidatePath(USERS_PATH);
      return { ok: false, error: "That admin was already removed. Reload the list." };
    }
    if (outcome === "last_admin") {
      return { ok: false, error: "There must always be at least one admin." };
    }
    if (outcome !== "removed") {
      throw new Error(`remove_admin_user returned ${String(outcome)}`);
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      parsedId.data,
    );
    if (deleteError) {
      console.error(
        `[admin-users] removed admin ${parsedId.data} but could not delete their auth user:`,
        deleteError.message,
      );
    }

    revalidatePath(USERS_PATH);
    return { ok: true, sessionsEnded: !deleteError };
  } catch (error) {
    console.error("[admin-users] remove failed", error);
    return {
      ok: false,
      error: toActionMessage(error, "Could not remove this admin."),
    };
  }
}
