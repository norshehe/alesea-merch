import type { ReactNode } from "react";
import { requireAdmin } from "@/features/admin/server/auth";
import { AdminShell } from "@/features/admin/components/admin-shell";

/**
 * The authoritative gate for every `/admin` route. `src/proxy.ts` only checks
 * that a Supabase user exists; membership in `admin_users` is proven here, on
 * the server, on every request.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await requireAdmin();

  return <AdminShell user={admin}>{children}</AdminShell>;
}
