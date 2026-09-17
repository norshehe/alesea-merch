"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useNavigationBlocker } from "@/features/admin/hooks/navigation-blocker";

/**
 * A `next/link` that asks before abandoning unsaved work.
 *
 * Every admin nav link goes through this. `onNavigate` fires only for
 * client-side, same-origin navigations — exactly the case `beforeunload` misses
 * — so the two guards compose without either one double-prompting: a
 * cmd-click, an external URL or a download still behave normally and never see
 * this dialog.
 *
 * `window.confirm` rather than an AlertDialog on purpose: `onNavigate` is
 * synchronous, and the decision to cancel has to be made before it returns.
 */
export function AdminLink({
  onNavigate,
  ...props
}: ComponentProps<typeof Link>) {
  const { isBlocked } = useNavigationBlocker();

  return (
    <Link
      {...props}
      onNavigate={(event) => {
        if (
          isBlocked &&
          !window.confirm(
            "You have unsaved changes on this page. Leave and discard them?",
          )
        ) {
          event.preventDefault();
          return;
        }
        onNavigate?.(event);
      }}
    />
  );
}
