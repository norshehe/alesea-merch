import { Boxes } from "lucide-react";
import { PageHeader } from "@/features/admin/components/page-header";
import { EmptyState } from "@/features/admin/components/empty-state";

/** Stub — nav must never 404. Real management lands in the next phase. */
export default function InventoryPage() {
  return (
    <>
      <PageHeader title="Inventory" description="Per-variant stock levels." />
      <EmptyState
        icon={Boxes}
        title="Coming next"
        description="This section isn't built yet. It's stubbed so the navigation stays complete."
      />
    </>
  );
}
