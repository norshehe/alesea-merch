"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reorderProduct } from "@/features/admin/products/server/product.actions";

interface IProductReorderButtonsProps {
  id: string;
  title: string;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * Up/down controls for one table row. The action renumbers the whole list and
 * revalidates the storefront; `router.refresh()` re-renders this table with the
 * new order.
 */
export function ProductReorderButtons({
  id,
  title,
  isFirst,
  isLast,
}: IProductReorderButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function move(direction: "up" | "down") {
    startTransition(async () => {
      const result = await reorderProduct(id, direction);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Move ${title} up`}
        disabled={isFirst || isPending}
        onClick={() => move("up")}
      >
        <ArrowUp aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Move ${title} down`}
        disabled={isLast || isPending}
        onClick={() => move("down")}
      >
        <ArrowDown aria-hidden="true" />
      </Button>
    </div>
  );
}
