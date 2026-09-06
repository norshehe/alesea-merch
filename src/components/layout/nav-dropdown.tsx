"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { IMainNavItem } from "@/components/layout/main-nav";

interface INavDropdownProps {
  item: IMainNavItem;
  /** Shared class for the top-level trigger so it matches plain nav links. */
  triggerClass: string;
}

/**
 * Top-level nav item with a sub-menu, mirroring alesea.co: the menu opens on
 * hover on pointer devices and on click/Enter everywhere (so touch and keyboard
 * both work). Escape closes and returns focus to the trigger.
 *
 * Deliberately not the Radix dropdown primitive — that one is click-only, and
 * the main site opens these on hover.
 */
export function NavDropdown({ item, triggerClass }: INavDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // Close on outside click (touch devices, where there is no mouseleave).
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={onKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`${triggerClass} inline-flex items-center gap-1`}
      >
        {item.label}
        <ChevronDown
          className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={1.8}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          // Sits flush under the 74px bar; min-width keeps the longest label
          // ("Tammocalao | 4-Bedroom") on one line.
          className="absolute top-full left-0 z-50 min-w-[232px] border border-line bg-cream py-2 shadow-[0_10px_30px_rgba(42,38,32,0.12)]"
        >
          {item.children?.map((child) => (
            <a
              key={child.href}
              role="menuitem"
              href={child.href}
              rel="noopener noreferrer"
              className="block px-5 py-2.5 text-[12.5px] tracking-[0.06em] text-ink transition-colors hover:bg-teal hover:text-white focus-visible:bg-teal focus-visible:text-white focus-visible:outline-none"
            >
              {child.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
