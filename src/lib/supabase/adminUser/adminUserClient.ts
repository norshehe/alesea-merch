import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Service-role reads of `admin_users`, for server jobs that run WITHOUT an
 * admin session — e.g. the new-order alert scheduled from the public checkout.
 *
 * `/admin/users` reads the same table through the cookie-bound client instead
 * (`features/admin/users/server/user.queries.ts`), so RLS evaluates as the
 * signed-in admin. Do not use this module for anything an admin page renders.
 */

export interface IAdminRecipient {
  /** `auth.users` id — safe to log, unlike the address. */
  id: string;
  email: string;
  name: string | null;
}

/** Every admin, for notification fan-out. */
export async function listAdminRecipients(): Promise<IAdminRecipient[]> {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("user_id, email, name");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.user_id,
    email: row.email,
    name: row.name,
  }));
}
