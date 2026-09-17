"use client";

import { useEffect, useId } from "react";
import { useNavigationBlocker } from "@/features/admin/hooks/navigation-blocker";

/**
 * Warn before unsaved edits are discarded — by a tab close, a reload, OR an
 * in-app navigation.
 *
 * Extracted from `InventoryGrid`, which was the only surface that had it — the
 * long forms (product, category, settings, home; two of them multi-tab) had the
 * most typing at stake and no guard at all.
 *
 * TWO mechanisms are required, because they cover different exits:
 *
 *  1. `beforeunload` — leaving the DOCUMENT. The browser supplies the wording.
 *  2. The navigation blocker — Next's client-side router, which does NOT fire
 *     `beforeunload`. Without it a sidebar click discarded a half-written
 *     product in silence while a reload of that same form was challenged, which
 *     is the more surprising half of the pair. `AdminLink` reads the flag.
 *
 * The key is per-hook-instance, so two dirty forms mounted at once each hold
 * their own block and neither clears the other's.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const { setBlocked } = useNavigationBlocker();
  const key = useId();

  useEffect(() => {
    if (!isDirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      // `preventDefault()` is the modern spelling; the browser supplies its own
      // wording and ignores any string we return.
      event.preventDefault();
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    setBlocked(key, isDirty);
    // Clearing on unmount matters: a form that navigates away after saving
    // would otherwise leave its block behind and freeze the whole sidebar.
    return () => setBlocked(key, false);
  }, [isDirty, key, setBlocked]);
}
