import Link from "next/link";
import { Boxes, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/features/admin/components/empty-state";
import { PageHeader } from "@/features/admin/components/page-header";
import { InventoryGrid } from "@/features/admin/inventory/components/inventory-grid";
import {
  getInventoryForProduct,
  listProductsForInventory,
} from "@/features/admin/inventory/server/inventory.queries";
import { listInventoryOrphans } from "@/features/admin/products/server/product.queries";

/**
 * Stock editing, one product at a time.
 *
 * The selected product lives in the URL rather than in component state so the
 * view is linkable and survives the `router.refresh()` that follows a save.
 */
export default async function InventoryPage({
  searchParams,
}: {
  // Next 16: `searchParams` is a Promise and MUST be awaited.
  searchParams: Promise<{ product?: string }>;
}) {
  const [{ product: requested }, products] = await Promise.all([
    searchParams,
    listProductsForInventory(),
  ]);

  if (products.length === 0) {
    return (
      <>
        <PageHeader title="Inventory" description="Per-variant stock levels." />
        <EmptyState
          icon={Boxes}
          title="No products yet"
          description="Stock is recorded per product variant, so there is nothing to count until a product exists."
          action={
            <Button render={<Link href="/admin/products/new" />}>
              <Plus aria-hidden="true" />
              New product
            </Button>
          }
        />
      </>
    );
  }

  // An unknown or missing id falls back to the first product rather than 404ing:
  // this page is a workbench, not a permalink to one record.
  const selected =
    products.find((option) => option.id === requested) ?? products[0];

  const [rows, orphans] = await Promise.all([
    getInventoryForProduct(selected.id),
    listInventoryOrphans(selected.id),
  ]);

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Per-variant stock levels. Blank means not tracked — it is never zero."
      />
      <InventoryGrid
        products={products}
        product={selected}
        rows={rows}
        orphans={orphans}
      />
    </>
  );
}
