import Image from "next/image";
import Link from "next/link";
import { ImageOff, Plus, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/features/admin/components/empty-state";
import { PageHeader } from "@/features/admin/components/page-header";
import { CategoryActiveSwitch } from "@/features/admin/categories/components/category-active-switch";
import { CategoryReorderButtons } from "@/features/admin/categories/components/category-reorder-buttons";
import { listAdminCategories } from "@/features/admin/categories/server/category.queries";
import { CATEGORY_FILTER_KEY_LABELS } from "@/features/admin/categories/schemas/category.schema";

/**
 * The home page's category tiles, in the order they render there. Inactive rows
 * are listed too — RLS lets an admin read them, and a tile you cannot see is a
 * tile you cannot bring back.
 */

/**
 * `unoptimized`: the external-URL half of the image pair can point at ANY host,
 * and `next/image` throws for a hostname missing from `next.config.ts`. A
 * 40px admin thumbnail gains nothing from the optimizer, and an operator
 * pasting a new URL must not be met with a crashed page.
 */
function Thumb({ url, alt }: { url: string | null; alt: string }) {
  if (!url) {
    return (
      <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-md">
        <ImageOff className="size-4" aria-hidden="true" />
      </span>
    );
  }
  return (
    <Image
      src={url}
      alt={alt}
      width={40}
      height={40}
      unoptimized
      className="bg-muted size-10 rounded-md object-cover"
    />
  );
}

export default async function AdminCategoriesPage() {
  const categories = await listAdminCategories();

  return (
    <>
      <PageHeader
        title="Categories"
        description="The tiles on the home page. Order and visibility here are exactly what the storefront renders."
        actions={
          <Button render={<Link href="/admin/categories/new" />}>
            <Plus aria-hidden="true" />
            New category
          </Button>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Add a tile and it will appear in the home page's category strip as soon as it is visible."
          action={
            <Button render={<Link href="/admin/categories/new" />}>
              <Plus aria-hidden="true" />
              New category
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">
                  <span className="sr-only">Image</span>
                </TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Filter key</TableHead>
                <TableHead>Visible</TableHead>
                <TableHead>
                  <span className="sr-only">Order</span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category, index) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <Thumb url={category.resolvedImage} alt={category.label} />
                  </TableCell>
                  <TableCell>
                    <span className="grid">
                      <span className="text-muted-foreground text-xs">
                        {category.eyebrow}
                      </span>
                      <span className="font-medium">{category.label}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">
                        {CATEGORY_FILTER_KEY_LABELS[category.filterKey]}
                      </Badge>
                      {/* The image pair, made visible: `image_path` wins over
                          `image_url`, so an operator can see which one is live. */}
                      {category.image ? (
                        <Badge variant="secondary">Uploaded</Badge>
                      ) : category.imageUrl ? (
                        <Badge variant="secondary">External URL</Badge>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell>
                    <CategoryActiveSwitch
                      id={category.id}
                      label={category.label}
                      isActive={category.isActive}
                    />
                  </TableCell>
                  <TableCell>
                    <CategoryReorderButtons
                      id={category.id}
                      label={category.label}
                      isFirst={index === 0}
                      isLast={index === categories.length - 1}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`/admin/categories/${category.id}`} />}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
