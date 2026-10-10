"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/features/admin/components/field";
import { SubmitButton } from "@/features/admin/components/submit-button";
import {
  inviteAdminSchema,
  type InviteAdminFormValues,
  type InviteAdminValues,
} from "@/features/admin/users/schemas/invitation.schema";
import { inviteAdmin } from "@/features/admin/users/server/user.actions";

const EMPTY: InviteAdminFormValues = { email: "", name: "" };

/**
 * Invite a new admin by email.
 *
 * A dialog rather than a `/new` page: two fields, and the list it adds to is the
 * page behind it. The copy says up front how sign-in works, because the email
 * deliberately carries no "click to join" link and an inviter who expects one
 * will assume it is broken.
 */
export function InviteAdminDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InviteAdminFormValues, undefined, InviteAdminValues>({
    resolver: zodResolver(inviteAdminSchema),
    defaultValues: EMPTY,
  });

  function changeOpen(next: boolean) {
    // Never close mid-request: the result toast would arrive for a form the
    // admin can no longer see.
    if (isSubmitting) return;
    setOpen(next);
    if (!next) reset(EMPTY);
  }

  const onSubmit = handleSubmit(async (values) => {
    const result = await inviteAdmin(values);

    if (!result.ok) {
      if (result.field === "email" || result.field === "name") {
        setError(result.field, { message: result.error });
      } else {
        toast.error(result.error);
      }
      return;
    }

    if (result.emailed) {
      toast.success(`Invitation sent to ${values.email}.`);
    } else {
      // Not an error: the invite exists and works. The admin just has to be the
      // messenger, so this stays on screen long enough to act on.
      toast.warning(`Invitation saved for ${values.email}.`, {
        description: result.notice,
        duration: 12000,
      });
    }

    setOpen(false);
    reset(EMPTY);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger render={<Button />}>
        <UserPlus aria-hidden="true" />
        Invite admin
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Invite an admin</DialogTitle>
            <DialogDescription>
              They&apos;ll get an email pointing them to the sign-in page. They
              sign in with this address and a code we email them — there is no
              password and no link to click. The invitation lasts 7 days.
            </DialogDescription>
          </DialogHeader>

          <Field
            label="Email"
            htmlFor="invite-email"
            required
            error={errors.email?.message}
          >
            <Input
              id="invite-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              autoFocus
              disabled={isSubmitting}
              {...register("email")}
            />
          </Field>

          <Field
            label="Name"
            htmlFor="invite-name"
            hint="Optional. Used to greet them and to label them in the admin list."
            error={errors.name?.message}
          >
            <Input
              id="invite-name"
              autoComplete="off"
              disabled={isSubmitting}
              {...register("name")}
            />
          </Field>

          <DialogFooter>
            <DialogClose
              render={<Button type="button" variant="outline" />}
              disabled={isSubmitting}
            >
              Cancel
            </DialogClose>
            <SubmitButton pending={isSubmitting} pendingLabel="Sending…" size="default">
              Send invitation
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
