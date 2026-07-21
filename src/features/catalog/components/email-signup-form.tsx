"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  emailSignupSchema,
  type EmailSignupValues,
} from "@/features/catalog/schemas/email-signup.schema";
import { captureEmail } from "@/features/catalog/server/capture-email";

interface IEmailSignupFormProps {
  /** Where the signup came from, forwarded to Airtable (e.g. "weekender-tote"). */
  source: string;
  placeholder?: string;
  buttonLabel?: string;
  /** "inline" puts input + button on one row; "stacked" stacks them. */
  variant?: "inline" | "stacked";
  className?: string;
}

/**
 * Reusable email-capture form (RHF + Zod, shadcn primitives). Submits to the
 * {@link captureEmail} server action, then shows an inline confirmation (plus a
 * toast, since both call sites sit below the fold). Inline error on invalid email.
 * Used by the coming-soon Tote detail page and the Tote teaser section.
 */
export function EmailSignupForm({
  source,
  placeholder = "you@email.com",
  buttonLabel = "Notify Me",
  variant = "inline",
  className,
}: IEmailSignupFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmailSignupValues>({
    resolver: zodResolver(emailSignupSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await captureEmail({ email: values.email, source });
    if (result.ok) {
      toast.success("You're on the list — we'll email you.");
      reset();
      setSubmitted(true);
    } else {
      toast.error(result.error);
    }
  });

  if (submitted) {
    return (
      <p
        className={`text-sm text-teal ${className ?? ""}`}
        role="status"
        aria-live="polite"
      >
        You&apos;re on the list — we&apos;ll email you when it lands.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className={className} noValidate>
      <div
        className={
          variant === "inline"
            ? "flex flex-col gap-2.5 sm:flex-row"
            : "flex flex-col gap-2.5"
        }
      >
        <Input
          type="email"
          placeholder={placeholder}
          aria-label="Email address"
          aria-invalid={errors.email ? true : undefined}
          disabled={isSubmitting}
          className={`h-auto rounded-none border bg-white px-[15px] py-[13px] text-sm text-ink focus-visible:border-teal focus-visible:ring-0 ${
            errors.email ? "border-destructive" : "border-line-deep"
          }`}
          {...register("email")}
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-auto shrink-0 rounded-full border border-teal bg-teal px-7 py-[13px] text-[12px] tracking-[0.18em] whitespace-nowrap uppercase text-white hover:bg-teal hover:brightness-110"
        >
          {isSubmitting ? "Sending…" : buttonLabel}
        </Button>
      </div>
      {errors.email ? (
        <p className="mt-1.5 text-[11px] tracking-[0.02em] text-destructive">
          {errors.email.message}
        </p>
      ) : null}
    </form>
  );
}
