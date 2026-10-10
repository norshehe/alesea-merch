/**
 * Shared HTML for every transactional email (order, back-in-stock, invitation).
 *
 * Mail-client constraints drive every choice here: inline styles only, a full
 * document with a light-only colour scheme (dark-mode clients otherwise invert
 * the brand colours unpredictably), and layout tables with `role="presentation"`
 * where two things must sit side by side — floats and flex are not reliable in
 * Outlook.
 *
 * Pure string building, no I/O; safe to import from server code anywhere.
 */

/** Escape a value for HTML text or a double-quoted attribute. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const BRAND = "#084e50";

/** Inline style fragments, shared so every email reads as one family. */
export const EMAIL_STYLE = {
  body: "margin:0 0 18px;font-size:15px;line-height:1.7;color:#6b6256;",
  label:
    "margin:28px 0 10px;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#084e50;",
  /** Fine print. Dark enough to stay legible on the cream card. */
  small: "margin:24px 0 0;font-size:12px;line-height:1.7;color:#7d7059;",
  emphasis: "color:#084e50;",
  button:
    "display:inline-block;padding:15px 32px;background:#084e50;color:#ffffff;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;border-radius:999px;",
} as const;

/** One escaped paragraph. */
export function emailParagraph(value: string, style: string = EMAIL_STYLE.body): string {
  return `<p style="${style}">${escapeHtml(value)}</p>`;
}

/** A pill CTA. `href` is escaped; pass only server-built URLs. */
export function emailButton(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="${EMAIL_STYLE.button}">${escapeHtml(label)}</a>`;
}

const CELL =
  "padding:10px 0;border-top:1px solid #e8dfd3;font-size:14px;line-height:1.6;color:#6b6256;";

/**
 * `label ............ value` as a one-row layout table (Outlook-safe).
 * Pass `value` as null for a full-width single cell.
 */
export function emailRow(
  label: string,
  value: string | null,
  options: { strong?: boolean } = {},
): string {
  const weight = options.strong ? `font-weight:700;color:${BRAND};` : "";
  const valueCell =
    value === null
      ? ""
      : `<td align="right" valign="top" style="${CELL}${weight}padding-left:16px;white-space:nowrap;">${escapeHtml(value)}</td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td valign="top" style="${CELL}${weight}">${escapeHtml(label)}</td>${valueCell}</tr></table>`;
}

export interface IEmailShellOptions {
  /** Document `<title>` — some clients show it in previews. Usually the subject. */
  title: string;
}

/**
 * Wrap pre-built inner HTML in the branded card and a complete HTML document.
 *
 * `heading` is plain text and is escaped here; `inner` is trusted HTML that
 * the caller has already built from escaped parts.
 */
export function emailShell(
  heading: string,
  inner: string,
  { title }: IEmailShellOptions,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;">
<div style="margin:0;padding:32px 16px;background:#f6f1eb;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#fbf8f2;padding:40px 32px;">
    <p style="margin:0 0 22px;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:${BRAND};">
      Alesea Lifestyle
    </p>
    <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;font-weight:400;color:${BRAND};">
      ${escapeHtml(heading)}
    </h1>
    ${inner}
  </div>
</div>
</body>
</html>`;
}

/** Plain-text sign-off shared by every email. */
export const EMAIL_SIGN_OFF = "— Alesea Lifestyle, La Union";
