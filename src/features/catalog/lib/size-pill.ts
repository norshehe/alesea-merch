/**
 * Canonical size-pill styling, shared by the PDP size selector and the grid
 * card quick-add picker so both read as one control (>=44px tap target).
 * `selected`/`out` are PDP-only states; the card picker uses the base
 * treatment (click = add, no persisted selection).
 */
export function sizePillClass({
  selected = false,
  out = false,
}: { selected?: boolean; out?: boolean } = {}): string {
  return [
    "min-w-[52px] cursor-pointer border px-4 py-3 text-[13px] tracking-[0.04em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
    selected
      ? "border-teal bg-teal text-white"
      : "border-line-deep bg-transparent text-[#5A5247] hover:border-teal",
    out ? "line-through opacity-40" : "",
  ].join(" ");
}
