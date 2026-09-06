import type { Metadata } from "next";
import { CircleAlert } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoginForm } from "@/features/admin/components/login-form";

export const metadata: Metadata = {
  title: "Sign in · Alesea Admin",
};

interface ILoginPageProps {
  // searchParams is a Promise in Next 16.
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: ILoginPageProps) {
  const { next, error } = await searchParams;
  // Only relative paths survive — `next` ends up in a redirect URL.
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="font-serif text-2xl tracking-tight">Alesea</p>
          <p className="text-muted-foreground mt-1 text-xs tracking-[0.18em] uppercase">
            Admin
          </p>
        </div>

        <Card>
          <CardHeader>
            <h1 className="text-base font-semibold">Sign in</h1>
            <p className="text-muted-foreground text-sm">
              Admin access is invite-only.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4">
            {error === "not-admin" ? (
              <p
                className="border-destructive/30 bg-destructive/10 text-destructive flex gap-2 rounded-md border p-3 text-xs"
                role="alert"
              >
                <CircleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
                <span>
                  That account is signed in but has no admin access yet. Ask an
                  existing admin to add you.
                </span>
              </p>
            ) : null}
            <LoginForm next={safeNext} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
