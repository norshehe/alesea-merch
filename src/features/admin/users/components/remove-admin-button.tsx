"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserMinus } from "lucide-react";
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
import { removeAdmin } from "@/features/admin/users/server/user.actions";

interface IRemoveAdminButtonProps {
  userId: string;
  /** Name or email, for the dialog and the toast. */
  label: string;
}

/**
 * Remove another admin, behind a confirmation.
 *
 * The page never renders this on the signed-in admin's own row, but that is
 * only courtesy — `removeAdmin` refuses self-removal against the session, and
 * the database refuses to remove the last admin.
 */
export function RemoveAdminButton({ userId, label }: IRemoveAdminButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await removeAdmin(userId);
      if (!result.ok) {
        // The usual refusals (already removed, last admin) won't change on a
        // retry, so the dialog closes and the list re-reads what is true.
        toast.error(result.error);
        setOpen(false);
        router.refresh();
        return;
      }
      setOpen(false);
      if (result.sessionsEnded) {
        toast.success(`${label} was removed.`);
      } else {
        // Access is already gone (no admin_users row); only deleting their
        // account — and with it their open sessions — failed.
        toast.warning(`${label} was removed.`, {
          description:
            "They no longer have admin access, but their account could not be deleted, so an open session will show a no-access page until it expires.",
          duration: 12000,
        });
      }
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
        <UserMinus aria-hidden="true" />
        Remove
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            They lose admin access immediately and are signed out everywhere. To
            give access back later, invite them again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={confirm}
          >
            {isPending ? "Removing…" : "Remove admin"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
