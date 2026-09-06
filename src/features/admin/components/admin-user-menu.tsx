import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IAdminUser } from "@/features/admin/server/auth";

interface IAdminUserMenuProps {
  user: IAdminUser;
}

/**
 * Who is signed in, plus sign out.
 *
 * Sign out is a real `<form method="post">`, not a client fetch: the POST hits
 * `/auth/signout`, a Route Handler — the only place the auth cookies can be
 * cleared — and the browser follows its redirect, so the whole app re-renders
 * signed out with no client state to reconcile. It also works without JS.
 */
export function AdminUserMenu({ user }: IAdminUserMenuProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="text-muted-foreground hidden max-w-[16rem] truncate text-xs sm:block"
        title={user.email}
      >
        {user.name ? `${user.name} · ` : ""}
        {user.email}
      </span>
      <form method="post" action="/auth/signout">
        <Button type="submit" variant="ghost" size="sm">
          <LogOut aria-hidden="true" />
          Sign out
        </Button>
      </form>
    </div>
  );
}
