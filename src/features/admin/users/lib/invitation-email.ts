import { formatAdminDate } from "@/features/admin/users/lib/format";

/** Escape interpolated values so a name can never inject markup. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface IInvitationEmailInput {
  /** The invitee's address — they sign in with exactly this. */
  email: string;
  /** Optional greeting name. */
  name: string | null;
  /** Who sent it, for the "X invited you" line. */
  inviterName: string;
  /** Absolute site origin, e.g. `https://shop.alesea.co`. */
  siteUrl: string;
  expiresAt: Date;
}

/**
 * Build the admin invitation email.
 *
 * ⚠️ The ONLY link is the bare `/login` page. No token, no query string, nothing
 * that signs anyone in. Microsoft Safe Links fetches every URL in an inbound
 * message within a second of delivery, so a link that carried a grant would be
 * spent before the invitee saw it — the exact failure that made us drop magic
 * links. A prefetched `/login` costs nothing; the invitee proves who they are
 * by typing the code from a SEPARATE email, which a scanner cannot do.
 *
 * Same visual language as the back-in-stock email: inline styles, single
 * column, no tables.
 */
export function buildInvitationEmail({
  email,
  name,
  inviterName,
  siteUrl,
  expiresAt,
}: IInvitationEmailInput): { subject: string; text: string; html: string } {
  const loginUrl = `${siteUrl.replace(/\/$/, "")}/login`;
  const expires = formatAdminDate(expiresAt);
  const greeting = name ? `Hi ${name},` : "Hi,";

  const subject = "You've been invited to the Alesea shop admin";

  const text = [
    greeting,
    "",
    `${inviterName} has invited you to help run the Alesea shop.`,
    "",
    "To accept:",
    `1. Go to ${loginUrl}`,
    `2. Enter this email address: ${email}`,
    "3. We'll email you a sign-in code. Type it in — there is no password.",
    "",
    `This invitation expires on ${expires}.`,
    "",
    "We never send sign-in links. If an email asks you to click a link to sign in, it isn't from us.",
    "",
    "— Alesea Lifestyle, La Union",
  ].join("\n");

  const html = `
<div style="margin:0;padding:32px 16px;background:#f6f1eb;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#fbf8f2;padding:40px 32px;">
    <p style="margin:0 0 22px;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#084e50;">
      Alesea Lifestyle
    </p>
    <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;font-weight:400;color:#084e50;">
      You're invited to the shop admin.
    </h1>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#6b6256;">
      ${escapeHtml(greeting)} ${escapeHtml(inviterName)} has invited you to help
      run the Alesea shop.
    </p>
    <ol style="margin:0 0 26px;padding-left:20px;font-size:15px;line-height:1.7;color:#6b6256;">
      <li>Open the sign-in page below.</li>
      <li>Enter this email address: <strong style="color:#084e50;">${escapeHtml(email)}</strong></li>
      <li>We'll email you a sign-in code. Type it in — there is no password.</li>
    </ol>
    <a href="${escapeHtml(loginUrl)}"
       style="display:inline-block;padding:15px 32px;background:#084e50;color:#ffffff;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;border-radius:999px;">
      Go to sign in
    </a>
    <p style="margin:26px 0 0;font-size:13px;line-height:1.7;color:#6b6256;">
      This invitation expires on ${escapeHtml(expires)}.
    </p>
    <p style="margin:24px 0 0;font-size:12px;line-height:1.7;color:#9a8c73;">
      We never send sign-in links. If an email asks you to click a link to sign
      in, it isn't from us.
    </p>
  </div>
</div>`.trim();

  return { subject, text, html };
}
