import { z } from "zod";

/**
 * Mirrors `admin_invitations` in `supabase/migrations/0011_admin_invitations.sql`.
 *
 * The email is trimmed and lowercased HERE, before it reaches the database,
 * because the table's check constraint rejects anything else and the open-invite
 * unique index compares exact strings. `Ana@Example.com` and `ana@example.com`
 * are one mailbox, and must be one invitation.
 */
export const inviteAdminSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required.")
    .email("Enter a valid email."),
  // Optional: it is only used to greet them and to label the admin list until
  // they have signed in. Blank stays blank rather than becoming a stored "".
  name: z.string().trim().max(120, "Keep the name under 120 characters."),
});

export type InviteAdminFormValues = z.input<typeof inviteAdminSchema>;
export type InviteAdminValues = z.output<typeof inviteAdminSchema>;

/**
 * Ids arriving from the browser. A malformed value is turned away here rather
 * than reaching Postgres as a `22P02`.
 */
export const recordIdSchema = z.string().uuid("That record no longer exists.");

/**
 * How long an invitation stays redeemable from when it was (re)sent. Matches
 * the column default `now() + interval '7 days'`, which only covers the INSERT;
 * Resend sets the new expiry from app code, so the two must agree.
 */
export const INVITATION_TTL_DAYS = 7;

/**
 * Derived, never stored: storing "expired" would need a job to flip it, and a
 * row that says "pending" a day after it lapsed is worse than no column at all.
 */
export type InvitationStatus = "pending" | "expired" | "accepted" | "revoked";
