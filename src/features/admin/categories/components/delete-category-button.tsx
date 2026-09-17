"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteCategory } from "@/features/admin/categories/server/category.actions";

interface IDeleteCategoryButtonProps {
  id: string;
  label: string;
}

/**
 * Deleting also removes the tile's uploaded image from storage, so it is behind
 * a confirmation rather than a bare button. Hiding the tile (the Visible
 * switch) is the reversible option and is offered in the copy.
 */
export function DeleteCategoryButton({ id, label }: IDeleteCategoryButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      toast.success(`${label} deleted.`);
      router.replace("/admin/categories");
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
        <Trash2 aria-hidden="true" />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the tile from the home page and deletes its uploaded
            image. Products are not affected. To take it down temporarily, turn
            off Visible instead.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={confirm}
          >
            {isPending ? "Deleting…" : "Delete category"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
