"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { IAssurance } from "@/lib/supabase/home/homeClient";

interface IAssurancesFieldProps {
  /** Cards in order — the strip renders them left to right. */
  value: IAssurance[];
  onChange: (next: IAssurance[]) => void;
  /** Per-row validation messages, aligned by index with `value`. */
  errors?: (
    | { title?: string | undefined; body?: string | undefined }
    | undefined
  )[];
  disabled?: boolean;
}

/**
 * Editor for the `home_content.assurances` jsonb array.
 *
 * Controlled over `IAssurance[]` behind a `<Controller>`, the same contract as
 * `LinkListField`, `ColorsField` and `TagInput` — one pattern for every admin
 * array field. `public.is_assurance_array()` requires a string `title` and a
 * string `body` on each element; the Zod rule matches so a half-filled row is
 * a field error rather than a 500.
 */
export function AssurancesField({
  value,
  onChange,
  errors,
  disabled,
}: IAssurancesFieldProps) {
  function update(index: number, patch: Partial<IAssurance>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
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
      {value.map((assurance, index) => {
        const rowError = errors?.[index];
        const name = assurance.title || `assurance ${index + 1}`;

        return (
          <div key={index} className="grid gap-1">
            <div className="flex items-start gap-2">
              <div className="grid flex-1 gap-1.5">
                <Input
                  aria-label={`Assurance ${index + 1} title`}
                  value={assurance.title}
                  disabled={disabled}
                  placeholder="Heavyweight, premium material"
                  aria-invalid={rowError?.title ? true : undefined}
                  onChange={(event) =>
                    update(index, { title: event.target.value })
                  }
                />
                <Input
                  aria-label={`Assurance ${index + 1} body`}
                  value={assurance.body}
                  disabled={disabled}
                  placeholder="230 GSM cotton blend."
                  aria-invalid={rowError?.body ? true : undefined}
                  onChange={(event) =>
                    update(index, { body: event.target.value })
                  }
                />
              </div>
              <div className="flex shrink-0 items-center gap-1">
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
            </div>
            {rowError?.title || rowError?.body ? (
              <p className="text-destructive text-xs">
                {rowError.title ?? rowError.body}
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
        onClick={() => onChange([...value, { title: "", body: "" }])}
      >
        <Plus aria-hidden="true" />
        Add assurance
      </Button>
    </div>
  );
}
