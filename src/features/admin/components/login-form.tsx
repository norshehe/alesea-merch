"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/features/admin/components/field";
import { SubmitButton } from "@/features/admin/components/submit-button";
import {
  adminLoginSchema,
  type AdminLoginValues,
} from "@/features/admin/schemas/login.schema";
import { sendMagicLink } from "@/features/admin/server/send-magic-link";

interface ILoginFormProps {
  /** Path to return to after the link is verified, forwarded to /auth/confirm. */
  next?: string;
}

/**
 * Email-only admin sign-in (RHF + Zod, mirroring `EmailSignupForm`).
 *
 * On success it swaps to a "check your email" panel rather than only firing a
 * toast: the next step happens in another app (the mailbox), so the instruction
 * has to stay on screen. The copy is intentionally neutral — the action returns
 * the same result for an unknown address, and this must not leak that.
 */
export function LoginForm({ next }: ILoginFormProps) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await sendMagicLink({ email: values.email, next });
    if (result.ok) {
      setSentTo(values.email);
    } else {
      toast.error(result.error);
    }
  });

  if (sentTo) {
    return (
      <div className="grid gap-3 text-sm" role="status" aria-live="polite">
        <MailCheck className="text-primary size-6" aria-hidden="true" />
        <p className="font-medium">Check your email</p>
        <p className="text-muted-foreground">
          If <span className="text-foreground">{sentTo}</span> has admin access,
          a sign-in link is on its way. The link works once and expires shortly.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          onClick={() => setSentTo(null)}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field
        label="Email"
        htmlFor="admin-email"
        required
        error={errors.email?.message}
        hint="We'll email you a one-time sign-in link."
      >
        <Input
          id="admin-email"
          type="email"
          autoComplete="email"
          placeholder="you@alesea.co"
          aria-invalid={errors.email ? true : undefined}
          disabled={isSubmitting}
          {...register("email")}
        />
      </Field>
      <SubmitButton pending={isSubmitting} pendingLabel="Sending…">
        Send sign-in link
      </SubmitButton>
    </form>
  );
}
