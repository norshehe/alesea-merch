import { cloneElement, isValidElement, type ReactNode } from "react";
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

/** The ARIA props this component injects into the control it labels. */
interface IDescribedProps {
  "aria-describedby"?: string;
  "aria-required"?: boolean;
  "aria-invalid"?: boolean | "true" | "false";
}

/**
 * The id of the hint/error paragraph for a field.
 *
 * ONE id for both states — only one of them ever renders — so a control that
 * `Field` cannot reach (a Base UI primitive behind a `Controller`, say) can
 * still point at it without knowing which one is showing. `SelectField` and
 * `SwitchField` use this.
 */
export function fieldDescriptionId(htmlFor: string): string {
  return `${htmlFor}-description`;
}

/**
 * Label + control + hint/error, the admin form primitive.
 *
 * shadcn's `<Form>` wrapper is deliberately not installed — it drags in a
 * context stack we do not need for three-person internal tooling. Every admin
 * form composes this instead:
 *
 *   <Field label="Title" htmlFor="title" error={errors.title?.message}>
 *     <Input id="title" {...register("title")} />
 *   </Field>
 *
 * The ARIA wiring is done HERE rather than by each consumer, because it was
 * previously done by nobody: the hint/error paragraph had an id that nothing
 * referenced, so a screen-reader user heard "invalid" and never heard why. The
 * single element child is cloned to receive `aria-describedby`, `aria-required`
 * (the `*` is decorative and `aria-hidden`) and `aria-invalid`. A consumer's own
 * value always wins, and `aria-describedby` is merged rather than replaced.
 *
 * A child that is NOT a single element — a `Controller`, a fragment — cannot be
 * wired this way, since the props would land on a component that ignores them.
 * Those go through `SelectField` / `SwitchField`, which wire the real control.
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
  const describedBy = error || hint ? fieldDescriptionId(htmlFor) : undefined;

  const control = isValidElement<IDescribedProps>(children)
    ? cloneElement(children, {
        "aria-describedby":
          [children.props["aria-describedby"], describedBy]
            .filter(Boolean)
            .join(" ") || undefined,
        "aria-required": children.props["aria-required"] ?? required,
        "aria-invalid":
          children.props["aria-invalid"] ?? (error ? true : undefined),
      })
    : children;

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
      {control}
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
