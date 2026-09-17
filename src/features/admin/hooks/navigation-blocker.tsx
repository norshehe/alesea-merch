"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface INavigationBlocker {
  /** True while at least one form on screen has unsaved work. */
  isBlocked: boolean;
  /**
   * Register or clear a block under a caller-stable key. Keyed rather than a
   * bare boolean because two dirty forms can be mounted at once (a page with a
   * form plus the inventory grid), and the second one clearing its flag must
   * not unblock navigation on behalf of the first.
   */
  setBlocked: (key: string, blocked: boolean) => void;
}

const NavigationBlockerContext = createContext<INavigationBlocker>({
  isBlocked: false,
  setBlocked: () => {},
});

/**
 * Tracks whether leaving the current admin page would discard unsaved work.
 *
 * The companion to `useUnsavedChangesGuard`, which can only cover leaving the
 * DOCUMENT: `beforeunload` does not fire for Next's client-side router, so a
 * sidebar click used to discard a half-written product silently while a reload
 * of the same form was properly challenged. This context is what `AdminLink`
 * consults to close that gap.
 */
export function NavigationBlockerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const keys = useRef<Set<string>>(new Set());
  const [isBlocked, setIsBlocked] = useState(false);

  const setBlocked = useCallback((key: string, blocked: boolean) => {
    if (blocked) keys.current.add(key);
    else keys.current.delete(key);
    // Derived from the set, never toggled directly, so the last form to clear
    // does not unblock while another is still dirty.
    setIsBlocked(keys.current.size > 0);
  }, []);

  const value = useMemo(
    () => ({ isBlocked, setBlocked }),
    [isBlocked, setBlocked],
  );

  return (
    <NavigationBlockerContext.Provider value={value}>
      {children}
    </NavigationBlockerContext.Provider>
  );
}

export function useNavigationBlocker(): INavigationBlocker {
  return useContext(NavigationBlockerContext);
}
