"use client";

import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
  type PathValue,
} from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, fieldDescriptionId } from "@/features/admin/components/field";

interface ISelectOption<TValue> {
  value: TValue;
  label: string;
}

interface ISelectFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  /** The trigger's `id`, and what the `<Label>` points at. Defaults to `name`. */
  id?: string;
  options: readonly ISelectOption<PathValue<TFieldValues, TName>>[];
  required?: boolean;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A labelled Base UI `Select` bound to React Hook Form.
 *
 * Every admin select repeated the same four-part wiring and every copy got the
 * same three things wrong:
 *
 * 1. `field.ref` was dropped, so `shouldFocusError` had nothing to focus and an
 *    invalid select was skipped when the form scrolled to the first error. The
 *    ref goes on the TRIGGER — the focusable element — not on `inputRef`, which
 *    points at Base UI's hidden form input.
 * 2. `field.onBlur` was dropped, so the field never became touched and
 *    `aria-invalid` never turned on, despite the trigger carrying
 *    `aria-invalid:` styling. Base UI has no blur callback on the root, and
 *    choosing a value is the moment the operator is "done" with the control,
 *    so the touch is recorded there.
 * 3. `onValueChange` hands back `T | null` (Base UI clears a select by passing
 *    null). Forwarding that straight into a `z.enum` field types as `null` and
 *    fails validation with an unhelpful message. None of these selects is
 *    clearable, so null is ignored.
 *
 * `Field` cannot inject its ARIA props through a `Controller`, so the trigger
 * is described by hand via `fieldDescriptionId` — the one stable id `Field`
 * gives its hint/error paragraph.
 */
export function SelectField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  id,
  options,
  required,
  hint,
  error,
  disabled,
  className,
}: ISelectFieldProps<TFieldValues, TName>) {
  const controlId = id ?? name;
  const describedBy = error || hint ? fieldDescriptionId(controlId) : undefined;

  return (
    <Field
      label={label}
      htmlFor={controlId}
      required={required}
      hint={hint}
      error={error}
      className={className}
    >
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            value={field.value}
            onValueChange={(value) => {
              if (value === null) return;
              field.onChange(value);
              field.onBlur();
            }}
          >
            <SelectTrigger
              id={controlId}
              ref={field.ref}
              className="w-full"
              disabled={disabled}
              aria-describedby={describedBy}
              aria-required={required}
              aria-invalid={error ? true : undefined}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={String(option.value)} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  );
}
