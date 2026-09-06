"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setProductStatus } from "@/features/admin/products/server/product.actions";
import type { ProductStatus } from "@/features/admin/products/schemas/product.schema";

interface IProductStatusToggleProps {
  id: string;
  title: string;
  status: ProductStatus;
}

/**
 * Publish / unpublish from the list row.
 *
 * `setProductStatus` had no callers, and every export of a `"use server"`
 * module is a live endpoint whether or not the UI reaches it — so it was either
 * a surface to build or an endpoint to delete. Built: taking a product off the
 * storefront is the one edit an operator wants without opening the form, and
 * doing it through the form means loading, changing a select, and saving every
 * other column back at the same time.
 *
 * A `<Button>`, not a `<Switch>`: this writes on click, and a switch that
 * commits immediately reads as a form control that does not.
 */
export function ProductStatusToggle({
  id,
  title,
  status,
}: IProductStatusToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const next: ProductStatus = status === "published" ? "draft" : "published";
  const label = next === "published" ? "Publish" : "Unpublish";

  function toggle() {
    startTransition(async () => {
      const result = await setProductStatus(id, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        next === "published"
          ? `${title} is now live.`
          : `${title} is back to draft.`,
      );
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={toggle}
      // The visible label is just "Publish"; the row it belongs to is only
      // obvious to someone who can see the table.
      aria-label={`${label} ${title}`}
    >
      {isPending ? "Saving…" : label}
    </Button>
  );
}
