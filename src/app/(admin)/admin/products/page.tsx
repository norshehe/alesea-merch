import { Package } from "lucide-react";
import { PageHeader } from "@/features/admin/components/page-header";
import { EmptyState } from "@/features/admin/components/empty-state";

/** Stub — nav must never 404. Real management lands in the next phase. */
export default function ProductsPage() {
  return (
    <>
      <PageHeader title="Products" description="Create, edit and publish products." />
      <EmptyState
        icon={Package}
        title="Coming next"
        description="This section isn't built yet. It's stubbed so the navigation stays complete."
      />
    </>
  );
}
