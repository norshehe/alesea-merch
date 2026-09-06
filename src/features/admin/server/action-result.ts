import "server-only";

/**
 * The shared vocabulary every admin Server Action speaks.
 *
 * This used to be six byte-identical copies, one per `*.actions.ts`, and they
 * had already drifted: products and categories handled neither `P0001` (a
 * `raise exception` from one of our own triggers) nor `PGRST116` (the row
 * vanished between the read and the write), so a record deleted in another tab
 * produced the generic fallback instead of saying so. One module, one set of
 * codes, and a per-feature map for the constraint names that differ.
 */

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : T))
  | { ok: false; error: string };

export interface IPostgresError {
  code?: string;
  message: string;
}

export function isPostgresError(error: unknown): error is IPostgresError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

/** Zod issue → the sentence the operator sees. */
export function firstIssue(
  issues: { message: string }[],
  fallback = "Some fields need attention.",
): string {
  return issues[0]?.message ?? fallback;
}

/**
 * Substring of the raw error → the sentence to show instead. Keyed by the
 * constraint name because that is what Postgres puts in the message, e.g.
 * `{ products_slug_key: "That slug is already used." }`.
 */
export type ConstraintMessages = Record<string, string>;

/**
 * Codes every table can raise, with wording that is true regardless of which
 * table raised them. A feature overrides any of these through its constraint
 * map, which is consulted first.
 */
const GENERIC_MESSAGES: Record<string, string> = {
  // unique_violation
  "23505": "Something with that value already exists.",
  // check_violation
  "23514": "That change breaks a database rule.",
  // not_null_violation
  "23502": "A required value is missing.",
  // foreign_key_violation
  "23503": "Something else still refers to this record.",
  // invalid_text_representation — a malformed uuid, or an unknown enum value.
  "22P02": "That record no longer exists.",
  // PostgREST: `.single()` matched no row. Almost always a record deleted in
  // another tab, or an RLS policy that no longer lets this admin see it.
  PGRST116:
    "That record no longer exists — it may have been changed in another tab.",
};

/** "is not an option" → "Is not an option". Trigger text is already a sentence. */
function asSentence(message: string): string {
  return `${message.charAt(0).toUpperCase()}${message.slice(1)}`;
}

/**
 * Translate a database error into something an operator can act on.
 *
 * The raw error is logged by the caller, never returned — it carries SQL and
 * column names. Constraint matches win over codes so a feature can say
 * "That slug is already used" where the generic answer would be vague.
 */
export function toActionMessage(
  error: unknown,
  fallback: string,
  constraints: ConstraintMessages = {},
): string {
  if (!isPostgresError(error)) return fallback;

  for (const [needle, message] of Object.entries(constraints)) {
    if (error.message.includes(needle)) return message;
  }

  // P0001 is a bare `raise exception` from one of our own triggers
  // (`inventory_options_exist`, `sync_order_stock`). Those messages are
  // written for operators, so pass them through rather than flattening them.
  if (error.code === "P0001") return asSentence(error.message);

  return GENERIC_MESSAGES[error.code ?? ""] ?? fallback;
}

/**
 * The message for a write that matched zero rows.
 *
 * ⚠️ PostgREST returns NO error when an UPDATE or DELETE matches nothing — and
 * an RLS-denied write *is* a zero-row write. Without an explicit `.select()` and
 * this check, a delete refused because the session expired or the `admin_users`
 * row was revoked reports success, toasts "deleted", and navigates away while
 * the record is still there. Every write in this feature appends `.select("id")`
 * and treats an empty result as failure.
 */
export function notWrittenMessage(subject: string): string {
  return `That ${subject} was not changed. It may have been deleted, or your session may no longer have permission — reload and try again.`;
}
