import { notFound } from "next/navigation";
import { PageHeader } from "@/features/admin/components/page-header";
import { CategoryForm } from "@/features/admin/categories/components/category-form";
import { DeleteCategoryButton } from "@/features/admin/categories/components/delete-category-button";
import { getAdminCategory } from "@/features/admin/categories/server/category.queries";

interface IEditCategoryPageProps {
  // Next 16: route params arrive as a Promise and must be awaited.
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({
  params,
}: IEditCategoryPageProps) {
  const { id } = await params;

  const category = await getAdminCategory(id);
  if (!category) notFound();

  return (
    <>
      <PageHeader
        title={category.label}
        description={
          category.isActive
            ? "Live on the home page."
            : "Hidden — not shown on the home page."
        }
        actions={
          <DeleteCategoryButton id={category.id} label={category.label} />
        }
      />
      <CategoryForm category={category} />
    </>
  );
}
