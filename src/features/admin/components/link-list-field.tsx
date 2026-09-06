"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { INavLink } from "@/lib/supabase/siteSettings/siteSettingsClient";

interface ILinkListFieldProps {
  /** Links in order. Order is what the header/footer renders. */
  value: INavLink[];
  onChange: (next: INavLink[]) => void;
  /** Per-row validation messages, aligned by index with `value`. */
  errors?: (
    | { label?: string | undefined; href?: string | undefined }
    | undefined
  )[];
  disabled?: boolean;
  /** Wording on the add button, e.g. "Add nav link". */
  addLabel?: string;
  labelPlaceholder?: string;
  hrefPlaceholder?: string;
}

/**
 * Editor for a `[{label, href}]` jsonb column (`nav_links`, `social_links`).
 *
 * Controlled over `INavLink[]` behind a `<Controller>` rather than
 * `useFieldArray`: the array is stored and validated whole, and the plain
 * value/onChange contract is the one `TagInput`, `ColorsField` and
 * `ImageUploadField` already use — so the component never has to know which
 * form it is embedded in, and every admin array field reads identically.
 *
 * Both columns are CHECK-constrained by `public.is_link_array()`: every element
 * must carry a string `label` AND a string `href`. The matching Zod rule lives
 * in `settings.schema.ts` so a half-filled row is a field error, not a 500.
 */
export function LinkListField({
  value,
  onChange,
  errors,
  disabled,
  addLabel = "Add link",
  labelPlaceholder = "Stay",
  hrefPlaceholder = "https://alesea.co/stay",
}: ILinkListFieldProps) {
  function update(index: number, patch: Partial<INavLink>) {
    onChange(value.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="grid gap-2">
      {value.map((link, index) => {
        const rowError = errors?.[index];
        const name = link.label || `link ${index + 1}`;

        return (
          <div key={index} className="grid gap-1">
            <div className="flex items-center gap-2">
              <Input
                aria-label={`Link ${index + 1} label`}
                value={link.label}
                disabled={disabled}
                placeholder={labelPlaceholder}
                aria-invalid={rowError?.label ? true : undefined}
                onChange={(event) => update(index, { label: event.target.value })}
                className="w-40 shrink-0"
              />
              <Input
                aria-label={`Link ${index + 1} URL`}
                value={link.href}
                disabled={disabled}
                placeholder={hrefPlaceholder}
                aria-invalid={rowError?.href ? true : undefined}
                onChange={(event) => update(index, { href: event.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${name} up`}
                disabled={disabled || index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${name} down`}
                disabled={disabled || index === value.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${name}`}
                disabled={disabled}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            {rowError?.label || rowError?.href ? (
              <p className="text-destructive text-xs">
                {rowError.label ?? rowError.href}
              </p>
            ) : null}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-self-start"
        disabled={disabled}
        onClick={() => onChange([...value, { label: "", href: "" }])}
      >
        <Plus aria-hidden="true" />
        {addLabel}
      </Button>
    </div>
  );
}
