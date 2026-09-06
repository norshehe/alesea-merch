"use client";

import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ISubmitButtonProps {
  /** In-flight state. Drives both the spinner and `disabled`. */
  pending?: boolean;
  children: React.ReactNode;
  /** Label swapped in while pending, e.g. "Saving…". Defaults to `children`. */
  pendingLabel?: React.ReactNode;
  className?: string;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
}

/**
 * Submit button with a spinner. `pending` is a prop rather than `useFormStatus`
 * so it works with React Hook Form's `isSubmitting`, which is what every admin
 * form here uses.
 */
export function SubmitButton({
  pending = false,
  children,
  pendingLabel,
  className,
  size = "lg",
  variant = "default",
}: ISubmitButtonProps) {
  return (
    <Button
      type="submit"
      size={size}
      variant={variant}
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn(className)}
    >
      {pending ? (
        <LoaderCircle className="animate-spin" aria-hidden="true" />
      ) : null}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}
