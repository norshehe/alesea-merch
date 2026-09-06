"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary for `/admin`. Must be a client component — React
 * error boundaries only exist on the client. It renders inside `AdminShell`, so
 * the operator keeps their navigation.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed px-6 py-12">
      <TriangleAlert className="text-destructive size-5" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium">Something went wrong</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {error.message || "This page failed to load."}
          {error.digest ? ` (${error.digest})` : ""}
        </p>
      </div>
      <Button type="button" onClick={reset} variant="outline" size="sm">
        Try again
      </Button>
    </div>
  );
}
