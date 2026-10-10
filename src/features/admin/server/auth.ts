import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** The signed-in operator, as the admin UI needs them. */
export interface IAdminUser {
  id: string;
  email: string;
  name: string | null;
}

/**
 * The authoritative admin check: a verified Supabase user AND a row in
 * `public.admin_users`. Membership in that table is what "admin" means — auth
 * alone is not enough, since Supabase will happily mint a session for any user
 * that exists.
 *
 * Wrapped in React `cache()` so `admin/layout.tsx` and the page it renders share
 * a single `getUser()` + one query per request instead of two round trips each.
 * The cache is per-request, never across requests.
 */
export const getAdminUser = cache(async (): Promise<IAdminUser | null> => {
  const supabase = await createSupabaseServerClient();

  // getUser(), not getSession(): getSession trusts the cookie without verifying
  // its signature against the auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // `.maybeSingle()` — no row is an expected state (a removed admin, or a user
  // whose invitation could not be accepted), not an error. The `eq` is what
  // scopes this to the caller: since 0011, `admin_users_read` lets an admin see
  // EVERY row, while a non-admin still sees only their own (i.e. none).
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id, email, name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[admin-auth] admin_users lookup failed:", error);
    return null;
  }
  if (!data) return null;

  return {
    id: data.user_id,
    email: data.email,
    name: data.name,
  };
});

/**
 * Gate an admin route. Returns the admin, or redirects — it never returns null.
 *
 * The two failure modes are deliberately kept apart:
 *
 * 1. No session at all → `/login`. `src/proxy.ts` agrees (no user ⇒ bounce to
 *    login), so there is nothing to loop on.
 *
 * 2. A valid session with NO `admin_users` row → `/not-authorized`.
 *    It must NOT be `/login`: the proxy sees a perfectly valid Supabase user and
 *    would immediately redirect `/login` back to `/admin`, which redirects to
 *    `/login`… an infinite loop. Signing them out here instead is not an option
 *    either — cookie writes throw during a Server Component render (see
 *    `createSupabaseServerClient`), so the sign-out would be silently discarded
 *    and the loop would happen anyway.
 *
 *    `/not-authorized` is therefore outside the proxy matcher AND outside
 *    `admin/layout.tsx` (so it never re-enters this function). It renders a dead
 *    end with a real sign-out form, which POSTs to a Route Handler where cookies
 *    CAN be cleared. It is reached by a user whose invitation was revoked or
 *    expired after their auth user was created, and by anyone left with a
 *    session after their `admin_users` row was removed.
 */
export async function requireAdmin(): Promise<IAdminUser> {
  const admin = await getAdminUser();
  if (admin) return admin;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/not-authorized" : "/login");
}
