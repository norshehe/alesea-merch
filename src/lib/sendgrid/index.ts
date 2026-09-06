import "server-only";

/**
 * Minimal SendGrid v3 mail client.
 *
 * Deliberately a plain `fetch` wrapper rather than `@sendgrid/mail`, matching the
 * Airtable client in this codebase: one endpoint, no SDK, no extra dependency.
 * Server-only — it reads `SENDGRID_API_KEY` and must never reach a client bundle.
 */

const API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
const FROM_NAME = process.env.SENDGRID_FROM_NAME ?? "Alesea Lifestyle";
const REPLY_TO = process.env.SENDGRID_REPLY_TO;

/** True when SendGrid can actually send (key + verified sender present). */
export function isSendGridConfigured(): boolean {
  return Boolean(API_KEY && FROM_EMAIL);
}

export interface ISendEmailInput {
  to: string;
  subject: string;
  /** Plain-text part. Always sent — some clients prefer it, and it aids deliverability. */
  text: string;
  html: string;
}

/**
 * Send one transactional email.
 *
 * One request per recipient (not a batched `personalizations` array) so a single
 * bad address can never fail a whole batch, and so each send maps 1:1 to the
 * Airtable row it stamps.
 *
 * @throws Error with the SendGrid status and error body on non-2xx.
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
}: ISendEmailInput): Promise<void> {
  if (!API_KEY || !FROM_EMAIL) {
    throw new Error("SendGrid is not configured.");
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      ...(REPLY_TO ? { reply_to: { email: REPLY_TO } } : {}),
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
      // Let SendGrid honour unsubscribes/bounces for transactional restock mail.
      mail_settings: { bypass_list_management: { enable: false } },
    }),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as {
        errors?: { message?: string }[];
      };
      const first = body.errors?.[0]?.message;
      if (first) detail = first;
    } catch {
      // Response body was not JSON — fall back to statusText.
    }
    throw new Error(`SendGrid send failed (${response.status}): ${detail}`);
  }
}
