import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Admin reads for `signups`. Everything goes through the COOKIE-BOUND client so
 * RLS evaluates as the signed-in admin — this is the customer mailing list, and
 * `signups` grants `anon` no policy at all. The service-role client would bypass
 * exactly the check that keeps it private.
 *
 * READ ONLY, by design. The only writers are the storefront signup form and the
 * back-in-stock cron job; see `signup.actions.ts`'s absence.
 */

/** One page of the signups table. Bigger than orders — these rows are one line each. */
export const SIGNUPS_PAGE_SIZE = 50;

/**
 * Where a signup is in its one-and-only notification lifecycle.
 *
 * `pending` (`notified_at IS NULL`) — still waiting for a back-in-stock email.
 * `notified` — has HAD its one email and will never be emailed again for that
 * source. That is the promise made at signup, so the two states are surfaced
 * rather than collapsed into a single list.
 */
export const SIGNUP_STATUSES = ["pending", "notified"] as const;
export type SignupStatus = (typeof SIGNUP_STATUSES)[number];

/** A hand-edited query string falls back to "all" rather than 404ing. */
export function parseSignupStatus(raw: string | undefined): SignupStatus | null {
  return SIGNUP_STATUSES.includes(raw as SignupStatus)
    ? (raw as SignupStatus)
    : null;
}

export interface IAdminSignup {
  id: string;
  email: string;
  /**
   * A form-placement label (e.g. "weekender-tote-teaser"), NOT necessarily a
   * product slug. The cron resolves it by longest-prefix match against slugs,
   * so it is shown verbatim — inventing a product name here would be a guess.
   */
  source: string;
  /** ISO timestamp of the one email that was sent, or null while waiting. */
  notifiedAt: string | null;
  /** The product slug the email was actually about. */
  notifiedFor: string | null;
  createdAt: string;
}

export interface IAdminSignupPage {
  signups: IAdminSignup[];
  /** Total matching the current filters, not the total in the table. */
  total: number;
  page: number;
  pageCount: number;
}

export interface ISignupCounts {
  total: number;
  pending: number;
  notified: number;
}

export interface IListAdminSignupsInput {
  status?: SignupStatus;
  q?: string;
  page?: number;
}

/**
 * Strip the characters PostgREST uses as filter syntax before interpolating a
 * search term into an `.or(...)` string. Commas and parentheses would end the
 * clause and let a typed value change which columns are matched; `%` and `*`
 * would silently widen the LIKE. Identical to `order.queries.ts` — same
 * hazard, same rule.
 */
function toSearchTerm(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/[,()%*\\"']/g, "")
    .trim()
    .slice(0, 80);
}

function toSignup(row: {
  id: string;
  email: string;
  source: string;
  notified_at: string | null;
  notified_for: string | null;
  created_at: string;
}): IAdminSignup {
  return {
    id: row.id,
    email: row.email,
    source: row.source,
    notifiedAt: row.notified_at,
    notifiedFor: row.notified_for,
    createdAt: row.created_at,
  };
}

/**
 * The shared filter, resolved once so the page and the CSV export cannot drift
 * apart — "export what I'm looking at" only holds if both apply the same rules.
 *
 * Returned as a plain description rather than applied to a builder: PostgREST's
 * builder type is generic over the row, so a shared "apply" helper would need a
 * cast. Six honest lines at each call site beat one dishonest one.
 */
interface ISignupFilter {
  /** `notified_at IS NULL` — still owed an email. */
  pendingOnly: boolean;
  /** `notified_at IS NOT NULL` — already had its one email. */
  notifiedOnly: boolean;
  /**
   * A PostgREST `.or(...)` clause matching email OR source, or null. Source is
   * searchable because it is how you find "everyone waiting on the tote".
   */
  orClause: string | null;
}

function toFilter(
  status: SignupStatus | undefined,
  q: string | undefined,
): ISignupFilter {
  const term = toSearchTerm(q);
  return {
    // The state IS the column — there is no separate status field to equal.
    pendingOnly: status === "pending",
    notifiedOnly: status === "notified",
    orClause: term ? `email.ilike.%${term}%,source.ilike.%${term}%` : null,
  };
}

/** One page of signups, newest first, with an optional status filter and search. */
export async function listAdminSignups({
  status,
  q,
  page = 1,
}: IListAdminSignupsInput = {}): Promise<IAdminSignupPage> {
  const supabase = await createSupabaseServerClient();

  const current = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const from = (current - 1) * SIGNUPS_PAGE_SIZE;

  const filter = toFilter(status, q);

  let query = supabase
    .from("signups")
    .select("id, email, source, notified_at, notified_for, created_at", {
      // `exact` on a mailing list this size is free, and the pager needs a
      // real total to know whether there is a next page.
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, from + SIGNUPS_PAGE_SIZE - 1);

  if (filter.pendingOnly) query = query.is("notified_at", null);
  if (filter.notifiedOnly) query = query.not("notified_at", "is", null);
  if (filter.orClause) query = query.or(filter.orClause);

  const { data, error, count } = await query;

  if (error) {
    console.error("[admin-signups] list failed", error);
    throw new Error("Could not load signups.");
  }

  const total = count ?? 0;

  return {
    signups: (data ?? []).map(toSignup),
    total,
    page: current,
    pageCount: Math.max(1, Math.ceil(total / SIGNUPS_PAGE_SIZE)),
  };
}

/**
 * Hard ceiling on one CSV. Well above any plausible list for this shop, and low
 * enough that a mis-click cannot try to stream the entire table into memory.
 */
export const SIGNUPS_EXPORT_LIMIT = 10_000;

/**
 * Every signup matching the filters, unpaginated, for the CSV export.
 *
 * Ordered OLDEST first — a spreadsheet of a mailing list reads as a timeline,
 * unlike the screen, where the newest capture is the interesting one.
 */
export async function listAdminSignupsForExport({
  status,
  q,
}: Omit<IListAdminSignupsInput, "page"> = {}): Promise<IAdminSignup[]> {
  const supabase = await createSupabaseServerClient();

  const filter = toFilter(status, q);

  let query = supabase
    .from("signups")
    .select("id, email, source, notified_at, notified_for, created_at")
    .order("created_at", { ascending: true })
    .limit(SIGNUPS_EXPORT_LIMIT);

  if (filter.pendingOnly) query = query.is("notified_at", null);
  if (filter.notifiedOnly) query = query.not("notified_at", "is", null);
  if (filter.orClause) query = query.or(filter.orClause);

  const { data, error } = await query;

  if (error) {
    console.error("[admin-signups] export query failed", error);
    throw new Error("Could not export signups.");
  }

  return (data ?? []).map(toSignup);
}

/**
 * Counts for the filter chips. Three `head: true` counts rather than pulling
 * every row: unlike orders, this table only grows, and none of the three needs
 * a row body.
 */
export async function countSignups(): Promise<ISignupCounts> {
  const supabase = await createSupabaseServerClient();

  const [total, pending] = await Promise.all([
    supabase.from("signups").select("id", { count: "exact", head: true }),
    supabase
      .from("signups")
      .select("id", { count: "exact", head: true })
      .is("notified_at", null),
  ]);

  if (total.error || pending.error) {
    // Chips are navigation, not data. A failure here must not take down the
    // table they sit above — they just render as zeroes.
    console.error("[admin-signups] counts failed", total.error ?? pending.error);
    return { total: 0, pending: 0, notified: 0 };
  }

  const totalCount = total.count ?? 0;
  const pendingCount = pending.count ?? 0;

  // Derived, not queried: `notified_at` is either null or not, so a third round
  // trip could only ever disagree with these two.
  return {
    total: totalCount,
    pending: pendingCount,
    notified: totalCount - pendingCount,
  };
}
