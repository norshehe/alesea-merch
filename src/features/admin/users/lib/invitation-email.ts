import { formatManilaDate } from "@/lib/format";
import {
  EMAIL_SIGN_OFF,
  EMAIL_STYLE,
  emailButton,
  emailParagraph,
  emailShell,
  escapeHtml,
} from "@/lib/email/shell";

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
 * Built on the shared `emailShell` (`@/lib/email/shell`), like every other
 * email.
 */
export function buildInvitationEmail({
  email,
  name,
  inviterName,
  siteUrl,
  expiresAt,
}: IInvitationEmailInput): { subject: string; text: string; html: string } {
  const loginUrl = `${siteUrl.replace(/\/$/, "")}/login`;
  const expires = formatManilaDate(expiresAt);
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
    EMAIL_SIGN_OFF,
  ].join("\n");

  const html = emailShell(
    "You're invited to the shop admin.",
    [
      emailParagraph(
        `${greeting} ${inviterName} has invited you to help run the Alesea shop.`,
      ),
      `<ol style="margin:0 0 26px;padding-left:20px;font-size:15px;line-height:1.7;color:#6b6256;">
      <li>Open the sign-in page below.</li>
      <li>Enter this email address: <strong style="${EMAIL_STYLE.emphasis}">${escapeHtml(email)}</strong></li>
      <li>We'll email you a sign-in code. Type it in — there is no password.</li>
    </ol>`,
      emailButton(loginUrl, "Go to sign in"),
      emailParagraph(
        `This invitation expires on ${expires}.`,
        `${EMAIL_STYLE.body}margin:26px 0 0;font-size:13px;`,
      ),
      emailParagraph(
        "We never send sign-in links. If an email asks you to click a link to sign in, it isn't from us.",
        EMAIL_STYLE.small,
      ),
    ].join("\n    "),
    { title: subject },
  );

  return { subject, text, html };
}
