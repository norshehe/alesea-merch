"use client";

import { useCartStore } from "@/store/cart.store";
import type { ICartLine } from "@/store/cart.store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ICartLineVariantsProps {
  line: ICartLine;
  /** Compact sizing for the drawer; regular for the cart page. */
  compact?: boolean;
}

/**
 * Inline color/size selectors for a cart line. Lets the customer switch a
 * variant without removing and re-adding. Uses the Shadcn Select primitive so
 * the option popup keeps the coastal aesthetic instead of OS chrome. Older
 * persisted lines predate the denormalized `colors`/`sizes` snapshot — those
 * fall back to static text.
 */
export function CartLineVariants({ line, compact = false }: ICartLineVariantsProps) {
  const changeVariant = useCartStore((s) => s.changeVariant);

  const colors = line.colors ?? [];
  const sizes = line.sizes ?? [];
  const hasVariants = colors.length > 0 || sizes.length > 0;

  // Old persisted lines have no variant snapshot — keep the original label.
  if (!hasVariants) {
    return (
      <span
        className={`${compact ? "mt-1 text-[11px]" : "mt-[5px] text-[12.5px]"} tracking-[0.08em] uppercase text-clay`}
      >
        {line.color} · {line.size}
      </span>
    );
  }

  const triggerClass = `rounded-none border-line-deep bg-transparent tracking-[0.08em] uppercase text-clay hover:border-teal ${
    compact ? "px-2 text-[10.5px]" : "px-2.5 text-[11.5px]"
  }`;
  // Static label for a single-option axis — padded to line up with the trigger.
  const textClass = `inline-flex items-center tracking-[0.08em] uppercase text-clay ${
    compact ? "h-7 px-2 text-[10.5px]" : "h-8 px-2.5 text-[11.5px]"
  }`;
  const itemClass = "text-[12px] tracking-[0.08em] uppercase";
  const triggerSize = compact ? "sm" : "default";

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "mt-1.5" : "mt-2"}`}>
      {colors.length > 1 ? (
        <Select
          value={line.color}
          onValueChange={(value) =>
            changeVariant(line.key, String(value), line.size)
          }
        >
          <SelectTrigger
            size={triggerSize}
            aria-label={`Change colour of ${line.name}`}
            className={triggerClass}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {colors.map((c) => (
              <SelectItem key={c.name} value={c.name} className={itemClass}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className={textClass}>{line.color}</span>
      )}

      {sizes.length > 1 ? (
        <Select
          value={line.size}
          onValueChange={(value) =>
            changeVariant(line.key, line.color, String(value))
          }
        >
          <SelectTrigger
            size={triggerSize}
            aria-label={`Change size of ${line.name}`}
            className={triggerClass}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sizes.map((s) => (
              <SelectItem key={s} value={s} className={itemClass}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className={textClass}>{line.size}</span>
      )}
    </div>
  );
}
