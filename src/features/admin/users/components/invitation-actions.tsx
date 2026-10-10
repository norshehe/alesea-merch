"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Send } from "lucide-react";
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
import {
  resendInvitation,
  revokeInvitation,
} from "@/features/admin/users/server/user.actions";

interface IInvitationActionsProps {
  id: string;
  email: string;
}

/**
 * Resend and Revoke for one open invitation.
 *
 * Resend is immediate — it is harmless and the common fix for "I never got
 * it" or an expired invite. Revoke is confirmed, because it also deletes the
 * account the invitee may already have started signing in with.
 *
 * One transition covers both buttons so neither can fire while the other is in
 * flight: revoking mid-resend would email someone an invitation that no longer
 * works.
 */
export function InvitationActions({ id, email }: IInvitationActionsProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function resend() {
    startTransition(async () => {
      const result = await resendInvitation(id);
      if (!result.ok) {
        toast.error(result.error);
        router.refresh();
        return;
      }
      if (result.emailed) {
        toast.success(`Invitation re-sent to ${email}.`);
      } else {
        toast.warning(`Invitation renewed for ${email}.`, {
          description: result.notice,
          duration: 12000,
        });
      }
      router.refresh();
    });
  }

  function revoke() {
    startTransition(async () => {
      const result = await revokeInvitation(id);
      if (!result.ok) {
        toast.error(result.error);
        setConfirmOpen(false);
        router.refresh();
        return;
      }
      setConfirmOpen(false);
      toast.success(`Invitation for ${email} revoked.`);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" disabled={isPending} onClick={resend}>
        <Send aria-hidden="true" />
        Resend
      </Button>
      <AlertDialog
        open={confirmOpen}
        onOpenChange={(next) => !isPending && setConfirmOpen(next)}
      >
        <AlertDialogTrigger
          render={<Button variant="destructive" size="sm" disabled={isPending} />}
        >
          <Ban aria-hidden="true" />
          Revoke
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke the invitation for {email}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won&apos;t be able to sign in with it. If they change their
              mind later, send a new invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={revoke}
            >
              {isPending ? "Revoking…" : "Revoke invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
