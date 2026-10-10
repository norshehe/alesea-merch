/**
 * Formatting for `/admin/users`. Dates use `formatManilaDate` from
 * `@/lib/format`, shared with the emails.
 */

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
