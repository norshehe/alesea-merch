"use client";

import { useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ITagInputProps {
  /** Committed tags, in order. Order is meaningful (sizes render in sequence). */
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Must match the `<Field htmlFor>` that labels this control. */
  id?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Free-form list-of-strings editor (sizes today; anything list-shaped later).
 *
 * Controlled over `string[]` rather than wired to `useFieldArray` so it works
 * behind a plain `<Controller>` in any admin form — the same contract as
 * `ColorsField` and `ImageUploadField`. One pattern for every array field.
 *
 * Duplicates are rejected case-insensitively but the FIRST spelling is kept:
 * `inventory` keys off these exact strings, so silently re-casing an existing
 * size would orphan its stock rows.
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  id,
  disabled,
  className,
}: ITagInputProps) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    // A paste of "S, M, L" is three tags, not one.
    const candidates = raw
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (candidates.length === 0) return;

    const next = [...value];
    for (const candidate of candidates) {
      const exists = next.some(
        (tag) => tag.toLowerCase() === candidate.toLowerCase(),
      );
      if (!exists) next.push(candidate);
    }

    if (next.length !== value.length) onChange(next);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      // Enter must not submit the surrounding form while a draft is open.
      event.preventDefault();
      commit(draft);
      return;
    }
    if (event.key === "Backspace" && draft.length === 0 && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!text.includes(",")) return;
    event.preventDefault();
    commit(text);
  }

  return (
    <div
      className={cn(
        "border-input flex min-h-8 w-full flex-wrap items-center gap-1.5 rounded-lg border bg-transparent px-2 py-1.5 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {value.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className="bg-muted text-foreground inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        id={id}
        type="text"
        value={draft}
        disabled={disabled}
        placeholder={value.length === 0 ? placeholder : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        // Committing on blur too — an operator who types a size and clicks
        // Save would otherwise lose it with no feedback.
        onBlur={() => commit(draft)}
        className="placeholder:text-muted-foreground min-w-24 flex-1 bg-transparent outline-none"
      />
    </div>
  );
}
