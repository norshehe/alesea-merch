import type { Metadata } from "next";
import { ShieldOff } from "lucide-react";
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
 */
export default function NotAuthorizedPage() {
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
