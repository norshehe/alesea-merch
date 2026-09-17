import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Link problem · Alesea Admin",
};

/**
 * Landing spot when `/auth/confirm` cannot verify the token. Lives inside the
 * `(admin)` route group so it inherits the admin root layout — a third root
 * layout would mean a third copy of the font payload.
 */
export default function AuthErrorPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <TriangleAlert className="text-muted-foreground size-5" aria-hidden="true" />
          <h1 className="text-base font-semibold">That link didn&apos;t work</h1>
          <p className="text-muted-foreground text-sm">
            Sign-in links expire quickly and can only be used once. Request a
            fresh one and open it from the same email.
          </p>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/login" />} size="lg">
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
