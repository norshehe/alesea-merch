"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/features/admin/components/field";
import { SubmitButton } from "@/features/admin/components/submit-button";
import {
  adminLoginSchema,
  adminOtpSchema,
  type AdminLoginValues,
  type AdminOtpValues,
} from "@/features/admin/schemas/login.schema";
import { sendSignInCode } from "@/features/admin/server/send-sign-in-code";
import { verifyAdminOtp } from "@/features/admin/server/verify-otp";

interface ILoginFormProps {
  /** Path to return to once the code is accepted. */
  next?: string;
}

/**
 * Admin sign-in in two steps: ask for an email, then take the numeric code
 * that email carries.
 *
 * The code is typed rather than clicked ON PURPOSE. This used to be a pure
 * magic link, and on Microsoft 365 it never worked: Defender Safe Links fetched
 * the URL within a second of delivery and spent the single-use token, so every
 * human click arrived at `otp_expired`. The emailed link still works where it
 * survives — `/auth/confirm` is unchanged — but the code is the path that
 * cannot be consumed by a machine.
 */
export function LoginForm({ next }: ILoginFormProps) {
  const router = useRouter();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const emailForm = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "" },
  });

  const codeForm = useForm<AdminOtpValues>({
    resolver: zodResolver(adminOtpSchema),
    defaultValues: { token: "" },
  });

  const onRequestCode = emailForm.handleSubmit(async (values) => {
    const result = await sendSignInCode({ email: values.email, next });
    if (result.ok) {
      setSentTo(values.email);
      codeForm.reset({ token: "" });
    } else {
      toast.error(result.error);
    }
  });

  const onSubmitCode = codeForm.handleSubmit(async (values) => {
    if (!sentTo) return;
    const result = await verifyAdminOtp({
      email: sentTo,
      token: values.token,
      next,
    });

    if (!result.ok) {
      // Clear the box: the next attempt needs a fresh code from the email, and
      // leaving six stale digits in place invites re-submitting the same ones.
      codeForm.reset({ token: "" });
      codeForm.setError("token", { message: result.error });
      return;
    }

    // The action wrote the session cookies onto its own response; refresh so the
    // layout re-renders as signed in before the admin route is requested.
    router.replace(result.next);
    router.refresh();
  });

  if (sentTo) {
    return (
      <form onSubmit={onSubmitCode} className="grid gap-4" noValidate>
        <div className="grid gap-1.5 text-sm" role="status" aria-live="polite">
          <p className="font-medium">Check your email</p>
          <p className="text-muted-foreground">
            If <span className="text-foreground">{sentTo}</span> has admin
            access, a sign-in code is on its way. It works once and expires
            shortly.
          </p>
        </div>
        <Field
          label="Sign-in code"
          htmlFor="admin-otp"
          required
          error={codeForm.formState.errors.token?.message}
          hint="The digits from the email. Typing the code beats clicking the link — mail scanners open links before you do."
        >
          <Input
            id="admin-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={10}
            placeholder="12345678"
            aria-invalid={codeForm.formState.errors.token ? true : undefined}
            disabled={codeForm.formState.isSubmitting}
            {...codeForm.register("token")}
          />
        </Field>
        <SubmitButton
          pending={codeForm.formState.isSubmitting}
          pendingLabel="Signing in…"
        >
          Sign in
        </SubmitButton>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          disabled={codeForm.formState.isSubmitting}
          onClick={() => setSentTo(null)}
        >
          Use a different email
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onRequestCode} className="grid gap-4" noValidate>
      <Field
        label="Email"
        htmlFor="admin-email"
        required
        error={emailForm.formState.errors.email?.message}
        hint="We'll email you a one-time sign-in code."
      >
        <Input
          id="admin-email"
          type="email"
          autoComplete="email"
          placeholder="you@alesea.co"
          aria-invalid={emailForm.formState.errors.email ? true : undefined}
          disabled={emailForm.formState.isSubmitting}
          {...emailForm.register("email")}
        />
      </Field>
      <SubmitButton
        pending={emailForm.formState.isSubmitting}
        pendingLabel="Sending…"
      >
        Send sign-in code
      </SubmitButton>
    </form>
  );
}
