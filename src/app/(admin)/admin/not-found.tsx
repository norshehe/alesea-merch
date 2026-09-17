import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed px-6 py-12">
      <p className="text-sm font-medium">Page not found</p>
      <p className="text-muted-foreground text-sm">
        That admin page doesn&apos;t exist.
      </p>
      <Button
        render={<Link href="/admin" />}
        variant="outline"
        size="sm"
      >
        Back to dashboard
      </Button>
    </div>
  );
}
