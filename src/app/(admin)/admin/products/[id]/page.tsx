import { notFound } from "next/navigation";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { PageHeader } from "@/features/admin/components/page-header";
import { DeleteProductButton } from "@/features/admin/products/components/delete-product-button";
import { ProductForm } from "@/features/admin/products/components/product-form";
import {
  getAdminProduct,
  listInventoryOrphans,
} from "@/features/admin/products/server/product.queries";

interface IEditProductPageProps {
  // Next 16: route params arrive as a Promise and must be awaited.
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: IEditProductPageProps) {
  const { id } = await params;

  const product = await getAdminProduct(id);
  if (!product) notFound();

  const orphans = await listInventoryOrphans(id);

  return (
    <>
      <PageHeader
        title={product.title}
        description={`/products/${product.slug}`}
        actions={<DeleteProductButton id={product.id} title={product.title} />}
      />

      {orphans.length > 0 ? (
        // Stock rows whose colour/size this product no longer declares. They are
        // invisible to the storefront, so the variant silently reads as "in
        // stock" while its real count sits on a name that no longer exists.
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/5 text-destructive mb-6 rounded-lg border p-3 text-sm"
        >
          <p className="flex items-center gap-2 font-medium">
            <TriangleAlert className="size-4" aria-hidden="true" />
            {orphans.length} stock{" "}
            {orphans.length === 1 ? "row does" : "rows do"} not match this
            product&apos;s options
          </p>
          <ul className="mt-2 grid gap-0.5 pl-6 text-xs">
            {orphans.map((orphan) => (
              <li key={orphan.id}>
                {orphan.color || "—"} / {orphan.size || "—"} · {orphan.stock} in
                stock
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs">
            A colour or size was renamed after stock was recorded. Fix the option
            names below, or update the rows on the{" "}
            <Link href="/admin/inventory" className="underline">
              Inventory page
            </Link>
            .
          </p>
        </div>
      ) : null}

      <ProductForm product={product} />
    </>
  );
}
