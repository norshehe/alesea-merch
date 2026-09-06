import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface IFieldProps {
  label: string;
  /** Must match the control's `id` so the label actually focuses it. */
  htmlFor: string;
  required?: boolean;
  /** Helper text shown under the control when there is no error. */
  hint?: string;
  /** Validation message, typically `formState.errors.x?.message` from RHF. */
  error?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Label + control + hint/error, the admin form primitive.
 *
 * shadcn's `<Form>` wrapper is deliberately not installed — it drags in a
 * context stack we do not need for three-person internal tooling. Every admin
 * form composes this instead, wiring the control by hand:
 *
 *   <Field label="Title" htmlFor="title" error={errors.title?.message}>
 *     <Input id="title" aria-invalid={!!errors.title} {...register("title")} />
 *   </Field>
 *
 * The error replaces the hint rather than stacking, so the field never reflows.
 */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: IFieldProps) {
  const describedBy = error
    ? `${htmlFor}-error`
    : hint
      ? `${htmlFor}-hint`
      : undefined;

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p id={describedBy} className="text-destructive text-xs">
          {error}
        </p>
      ) : hint ? (
        <p id={describedBy} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
