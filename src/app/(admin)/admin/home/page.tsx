import { House } from "lucide-react";
import { PageHeader } from "@/features/admin/components/page-header";
import { EmptyState } from "@/features/admin/components/empty-state";

/** Stub — nav must never 404. Real management lands in the next phase. */
export default function HomePage() {
  return (
    <>
      <PageHeader title="Home page" description="Content for the storefront home page." />
      <EmptyState
        icon={House}
        title="Coming next"
        description="This section isn't built yet. It's stubbed so the navigation stays complete."
      />
    </>
  );
}
