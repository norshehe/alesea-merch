"use client";

import { useEffect } from "react";

/**
 * Warn before a tab close / reload discards unsaved edits.
 *
 * Extracted from `InventoryGrid`, which was the only surface that had it — the
 * long forms (product, category, settings, home; two of them multi-tab) had the
 * most typing at stake and no guard at all.
 *
 * ⚠️ This only covers leaving the DOCUMENT. Next's client-side router does not
 * fire `beforeunload`, so a sidebar click still navigates away silently; the
 * grid additionally confirms by hand before switching products. Guarding
 * in-app navigation would need `onNavigate` interception on every admin link,
 * which is a bigger change than this review is for.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
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
}
