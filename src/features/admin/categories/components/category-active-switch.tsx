"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setCategoryActive } from "@/features/admin/categories/server/category.actions";

interface ICategoryActiveSwitchProps {
  id: string;
  label: string;
  isActive: boolean;
}

/**
 * Show/hide a tile straight from the table.
 *
 * The switch renders from the server's value rather than local state: the
 * action revalidates the home page and `router.refresh()` re-reads this row, so
 * the control can only ever show what was actually saved. A failed toggle
 * therefore snaps back on its own.
 */
export function CategoryActiveSwitch({
  id,
  label,
  isActive,
}: ICategoryActiveSwitchProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle(next: boolean) {
    startTransition(async () => {
      const result = await setCategoryActive(id, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(next ? `${label} is visible.` : `${label} is hidden.`);
      router.refresh();
    });
  }

  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      aria-label={`${isActive ? "Hide" : "Show"} ${label} on the home page`}
      onCheckedChange={toggle}
    />
  );
}
