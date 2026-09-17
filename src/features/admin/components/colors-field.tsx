"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { IProductColor } from "@/features/catalog/types";

/** Brand teal — the least surprising starting swatch for a new colour row. */
const DEFAULT_HEX = "#084e50";
const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

interface IColorsFieldProps {
  /** Colour options in order. `value[0]` is the default swatch on the PDP. */
  value: IProductColor[];
  onChange: (next: IProductColor[]) => void;
  /** Per-row validation messages, aligned by index with `value`. */
  errors?: (
    | { name?: string | undefined; hex?: string | undefined }
    | undefined
  )[];
  disabled?: boolean;
}

/**
 * Editor for the `products.colors` jsonb array.
 *
 * Controlled over `IProductColor[]` (behind a `<Controller>`) rather than
 * `useFieldArray`: the array is stored and validated whole, and a plain
 * value/onChange contract is the same one `TagInput` and `ImageUploadField`
 * use, so every admin array field reads identically.
 *
 * The swatch and the hex text box are two views of ONE value — editing either
 * writes the same `hex`, so there is no state to keep in sync.
 *
 * Renaming a colour on a product that already has stock orphans those
 * `inventory` rows (the DB trigger cannot see a write to `products`). The edit
 * page surfaces that with the `inventory_orphans` banner.
 */
export function ColorsField({
  value,
  onChange,
  errors,
  disabled,
}: IColorsFieldProps) {
  function update(index: number, patch: Partial<IProductColor>) {
    onChange(value.map((c, i) => (i === index ? { ...c, ...patch } : c)));
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
      {value.map((color, index) => {
        const rowError = errors?.[index];
        // `<input type="color">` rejects anything but #rrggbb, and a half-typed
        // hex is normal while the operator is still typing.
        const swatch = HEX_PATTERN.test(color.hex) ? color.hex : DEFAULT_HEX;

        return (
          <div key={index} className="grid gap-1">
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label={`Colour ${index + 1} swatch`}
                value={swatch}
                disabled={disabled}
                onChange={(event) => update(index, { hex: event.target.value })}
                className="border-input size-8 shrink-0 cursor-pointer rounded-lg border bg-transparent p-0.5"
              />
              <Input
                aria-label={`Colour ${index + 1} hex`}
                value={color.hex}
                disabled={disabled}
                placeholder={DEFAULT_HEX}
                aria-invalid={rowError?.hex ? true : undefined}
                onChange={(event) => update(index, { hex: event.target.value })}
                className="w-28 font-mono"
              />
              <Input
                aria-label={`Colour ${index + 1} name`}
                value={color.name}
                disabled={disabled}
                placeholder="Sand"
                aria-invalid={rowError?.name ? true : undefined}
                onChange={(event) => update(index, { name: event.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${color.name || `colour ${index + 1}`} up`}
                disabled={disabled || index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${color.name || `colour ${index + 1}`} down`}
                disabled={disabled || index === value.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${color.name || `colour ${index + 1}`}`}
                disabled={disabled}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
            {rowError?.name || rowError?.hex ? (
              <p className="text-destructive text-xs">
                {rowError.name ?? rowError.hex}
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
        onClick={() => onChange([...value, { name: "", hex: DEFAULT_HEX }])}
      >
        <Plus aria-hidden="true" />
        Add colour
      </Button>
    </div>
  );
}
