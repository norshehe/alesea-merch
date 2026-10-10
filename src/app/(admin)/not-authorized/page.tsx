import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { acceptInvitation } from "@/features/admin/users/server/invitations";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "No access · Alesea Admin",
};

/**
 * Dead end for a signed-in user with no `public.admin_users` row.
 *
 * Deliberately OUTSIDE `/admin` (so `admin/layout.tsx`'s `requireAdmin()` never
 * runs here) and outside the `src/proxy.ts` matcher (so the proxy, which sees a
 * perfectly valid Supabase user, never bounces it anywhere). Either would create
 * a redirect loop. Signing out is the only way forward, and it is a real form
 * POST to a Route Handler because that is the only context that can clear the
 * auth cookies.
 *
 * One way out other than signing out: an invitation that could not be accepted
 * at sign-in (a transient failure in `verifyAdminOtp`) is retried here, once
 * per visit. Only a call that actually creates the `admin_users` row redirects,
 * and the invite is consumed by that call, so `/admin` → here → `/admin` can
 * happen at most once and never loops. `getUser()`, not `getSession()`, so the
 * id handed to the service-role accept is one the auth server vouched for.
 */
export default async function NotAuthorizedPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email && (await acceptInvitation(user.id, user.email))) {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <ShieldOff className="text-muted-foreground size-5" aria-hidden="true" />
          <h1 className="text-base font-semibold">Account not authorised</h1>
          <p className="text-muted-foreground text-sm">
            You&apos;re signed in, but this account hasn&apos;t been granted admin
            access. Ask an existing admin to add you, then sign in again.
          </p>
        </CardHeader>
        <CardContent>
          <form method="post" action="/auth/signout">
            <Button type="submit" size="lg" variant="outline">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
