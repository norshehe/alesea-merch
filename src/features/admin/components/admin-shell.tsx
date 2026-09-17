import type { ReactNode } from "react";
import { NavigationBlockerProvider } from "@/features/admin/hooks/navigation-blocker";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { AdminMobileNav } from "@/features/admin/components/admin-mobile-nav";
import { AdminUserMenu } from "@/features/admin/components/admin-user-menu";
import type { IAdminUser } from "@/features/admin/server/auth";

interface IAdminShellProps {
  user: IAdminUser;
  children: ReactNode;
}

/**
 * Admin chrome: sidebar + header + content column. Still a Server Component —
 * the interactive pieces opt in individually, so page content stays out of the
 * client bundle.
 *
 * `NavigationBlockerProvider` wraps everything because both ends of the guard
 * live here: the forms that register unsaved work render inside `children`, and
 * the nav links that must ask before discarding it are in the sidebar and the
 * mobile menu. Anything narrower would leave one of the two outside the
 * provider.
 */
export function AdminShell({ user, children }: IAdminShellProps) {
  return (
    <NavigationBlockerProvider>
      <div className="flex min-h-dvh">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="bg-background/95 sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-3 backdrop-blur md:px-6">
            <AdminMobileNav />
            <div className="flex-1" />
            <AdminUserMenu user={user} />
          </header>
          <main className="w-full max-w-6xl p-4 md:p-6">{children}</main>
        </div>
      </div>
    </NavigationBlockerProvider>
  );
}
