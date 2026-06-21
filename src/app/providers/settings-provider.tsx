"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  FREE_SHIP_THRESHOLD,
  SHIPPING,
} from "@/features/catalog/constants/products";

/**
 * Shipping/currency settings exposed to client components (cart, checkout).
 * Hydrated from server-fetched siteSettings in the root layout. The cart store
 * stays synchronous — these values are read from context at render time.
 */
export interface ISettingsContext {
  currency: string;
  freeShipThreshold: number;
  standardShipping: number;
  expressShipping: number;
}

/** Local defaults, used when no provider is present (matches the design). */
const FALLBACK: ISettingsContext = {
  currency: "PHP",
  freeShipThreshold: FREE_SHIP_THRESHOLD,
  standardShipping: SHIPPING.standard,
  expressShipping: SHIPPING.express,
};

const SettingsContext = createContext<ISettingsContext>(FALLBACK);

export function SettingsProvider({
  value,
  children,
}: {
  value: ISettingsContext;
  children: ReactNode;
}) {
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

/** Read shipping/currency settings, falling back to local defaults. */
export function useSettings(): ISettingsContext {
  return useContext(SettingsContext);
}
