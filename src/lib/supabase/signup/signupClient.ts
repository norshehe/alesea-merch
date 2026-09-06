import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Signup writes. Goes through the service-role client because `signups` grants
 * `anon` no policy — the mailing list must not be readable or writable with the
 * public key.
 */

export interface ICreateSignupInput {
  email: string;
  /** Form placement the signup came from, e.g. "weekender-tote-teaser". */
  source: string;
}

/** SQLSTATE for a unique violation. */
const UNIQUE_VIOLATION = "23505";

/**
 * Record an email signup, treating a repeat signup as success.
 *
 * `signups` is uniquely indexed on `(lower(email), source)`. That is an
 * expression index, which `ON CONFLICT` (and so PostgREST's `upsert`) cannot
 * target, so the duplicate is swallowed here instead. It must stay a plain
 * insert rather than an upsert anyway: overwriting the existing row would reset
 * `notified_at` and re-send a back-in-stock email the customer already got.
 */
export async function createSignup(input: ICreateSignupInput): Promise<void> {
  // `created_at` has a DB default; omitting it lets Postgres stamp it.
  const { error } = await supabaseAdmin
    .from("signups")
    .insert({ email: input.email, source: input.source });

  if (error && error.code !== UNIQUE_VIOLATION) throw error;
}

/** A signup that has never been emailed a back-in-stock notice. */
export interface IPendingSignup {
  id: string;
  email: string;
  source: string;
}

/**
 * Every signup still owed a notification.
 *
 * Filtered in the database, not in JS: there is a partial index on
 * `notified_at IS NULL`, so this stays cheap as the notified rows accumulate.
 */
export async function listPendingSignups(): Promise<IPendingSignup[]> {
  const { data, error } = await supabaseAdmin
    .from("signups")
    .select("id, email, source")
    .is("notified_at", null);

  if (error) throw error;
  return data ?? [];
}

/**
 * Stamp (or, with nulls, un-stamp) a signup's notification state.
 *
 * The notification job stamps BEFORE sending and rolls back on failure, so this
 * has to work in both directions — `notified_at`/`notified_for` are nullable,
 * and clearing them means NULL, not an empty string, or the row would no longer
 * match {@link listPendingSignups}.
 */
export async function markSignupNotified(
  id: string,
  notifiedAt: string | null,
  notifiedFor: string | null,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("signups")
    .update({ notified_at: notifiedAt, notified_for: notifiedFor })
    .eq("id", id);

  if (error) throw error;
}
