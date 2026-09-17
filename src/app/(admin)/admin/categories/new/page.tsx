import { PageHeader } from "@/features/admin/components/page-header";
import { CategoryForm } from "@/features/admin/categories/components/category-form";

export default function NewCategoryPage() {
  return (
    <>
      <PageHeader
        title="New category"
        description="It appears on the home page as soon as it is visible."
      />
      <CategoryForm category={null} />
    </>
  );
}
