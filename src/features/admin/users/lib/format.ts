/**
 * Formatting shared by `/admin/users` and the invitation email, so the date an
 * admin sees in the list is the date the invitee reads in their inbox.
 */

/**
 * Pinned to Manila. Both callers render on the server (UTC on Vercel), and an
 * invite sent in the Manila morning would otherwise print the previous day.
 */
const DATE_FORMAT = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Manila",
});

export function formatAdminDate(value: string | Date): string {
  return DATE_FORMAT.format(typeof value === "string" ? new Date(value) : value);
}

/**
 * How an admin is named in the UI and in emails: their name when they have
 * one, otherwise the address. `name` is optional at invite time and may be
 * blank or whitespace in rows created by hand.
 */
export function adminDisplayName(user: {
  name: string | null;
  email: string;
}): string {
  return user.name?.trim() || user.email;
}
