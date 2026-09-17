"use client";

import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fieldDescriptionId } from "@/features/admin/components/field";
import { cn } from "@/lib/utils";

interface ISwitchFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  /** The switch's `id`. Defaults to `name`. */
  id?: string;
  /** The sentence under the switch explaining what turning it on does. */
  description?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A boolean field: label above, switch and its explanation on one row.
 *
 * `Field` puts the control BELOW its label and injects ARIA into a single
 * element child, neither of which fits a switch sitting beside its own
 * sentence — which is why `product-form` and `category-form` each hand-rolled
 * this markup, and why neither of them wired `aria-describedby` or surfaced a
 * validation error at all. This is that markup, once, with the wiring.
 *
 * `Switch` is a Base UI primitive, not a checkbox input, so it must be driven
 * by a `Controller`; `register()` yields a silently empty field.
 */
export function SwitchField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  id,
  description,
  error,
  disabled,
  className,
}: ISwitchFieldProps<TFieldValues, TName>) {
  const controlId = id ?? name;
  const describedBy =
    error || description ? fieldDescriptionId(controlId) : undefined;

  return (
    <div className={cn("grid gap-2", className)}>
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <Switch
              id={controlId}
              ref={field.ref}
              checked={field.value}
              disabled={disabled}
              aria-describedby={describedBy}
              aria-invalid={error ? true : undefined}
              onCheckedChange={(checked) => {
                field.onChange(checked);
                field.onBlur();
              }}
            />
          )}
        />
        {description ? (
          <Label
            htmlFor={controlId}
            id={error ? undefined : describedBy}
            className="text-muted-foreground text-xs font-normal"
          >
            {description}
          </Label>
        ) : null}
      </div>
      {error ? (
        <p id={describedBy} className="text-destructive text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
