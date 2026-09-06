import { PageHeader } from "@/features/admin/components/page-header";
import { ProductForm } from "@/features/admin/products/components/product-form";

export default function NewProductPage() {
  return (
    <>
      <PageHeader
        title="New product"
        description="It stays a draft until you publish it."
      />
      <ProductForm product={null} />
    </>
  );
}
