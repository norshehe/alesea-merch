import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { InvitationStatus } from "@/features/admin/users/schemas/invitation.schema";

/**
 * Admin reads for `/admin/users`.
 *
 * Through the COOKIE-BOUND client, like every other admin read, so RLS
 * evaluates as the signed-in admin: `admin_users_read` and
 * `admin_invitations_admin_read` (0011) are what let an admin see the whole
 * list. A non-admin session would get empty lists, not someone else's data.
 * Writes are the opposite — see `user.actions.ts`.
 */

export interface IAdminListUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface IAdminInvitation {
  id: string;
  email: string;
  name: string | null;
  invitedBy: string | null;
  createdAt: string;
  expiresAt: string;
  lastSentAt: string | null;
  status: InvitationStatus;
}

/** Status is derived at read time — see `InvitationStatus`. */
export function invitationStatus(
  row: { accepted_at: string | null; revoked_at: string | null; expires_at: string },
  now: Date = new Date(),
): InvitationStatus {
  if (row.accepted_at) return "accepted";
  if (row.revoked_at) return "revoked";
  return new Date(row.expires_at) <= now ? "expired" : "pending";
}

/** Every admin, oldest first, so the founding admin sits at the top. */
export async function listAdminUsers(): Promise<IAdminListUser[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id, email, name, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin-users] list admins failed", error);
    throw new Error("Could not load admins.");
  }

  return (data ?? []).map((row) => ({
    id: row.user_id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
  }));
}

/**
 * Open invitations only — pending and expired. Accepted ones are already in
 * the admin list, and revoked ones are history nobody acts on; listing them
 * would bury the two states that need a decision.
 */
export async function listOpenInvitations(): Promise<IAdminInvitation[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("admin_invitations")
    .select(
      "id, email, name, invited_by, created_at, expires_at, last_sent_at, accepted_at, revoked_at",
    )
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin-users] list invitations failed", error);
    throw new Error("Could not load invitations.");
  }

  const now = new Date();
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastSentAt: row.last_sent_at,
    status: invitationStatus(row, now),
  }));
}
