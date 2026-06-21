import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CatalogCategory, ICatalogProduct } from "@/features/catalog/types";

export interface ICartLine {
  /** Unique per variant: `${id}|${color}|${size}`. */
  key: string;
  id: string;
  slug: string;
  name: string;
  price: number;
  /** ISO currency for `price`, carried from the product. */
  currency: string;
  color: string;
  size: string;
  category: CatalogCategory;
  quantity: number;
}

function lineKey(id: string, color: string, size: string): string {
  return `${id}|${color}|${size}`;
}

interface CartState {
  lines: ICartLine[];
  /** Cart drawer (sheet) open state. */
  open: boolean;
  add: (
    product: ICatalogProduct,
    color: string,
    size: string,
    quantity?: number,
  ) => void;
  changeQuantity: (key: string, delta: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  // Derived selectors — keep components subscription-narrow.
  count: () => number;
  subtotal: () => number;
}

/**
 * Global cart state. Client-only — product data belongs in the catalog/React Query.
 * Persisted to localStorage so the bag survives reloads.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      open: false,
      add: (product, color, size, quantity = 1) =>
        set((state) => {
          const key = lineKey(product.id, color, size);
          const existing = state.lines.find((l) => l.key === key);
          if (existing) {
            return {
              open: true,
              lines: state.lines.map((l) =>
                l.key === key ? { ...l, quantity: l.quantity + quantity } : l,
              ),
            };
          }
          return {
            open: true,
            lines: [
              ...state.lines,
              {
                key,
                id: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                currency: product.currency,
                color,
                size,
                category: product.category,
                quantity,
              },
            ],
          };
        }),
      changeQuantity: (key, delta) =>
        set((state) => ({
          lines: state.lines
            .map((l) =>
              l.key === key ? { ...l, quantity: l.quantity + delta } : l,
            )
            .filter((l) => l.quantity > 0),
        })),
      setQuantity: (key, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) =>
                  l.key === key ? { ...l, quantity } : l,
                ),
        })),
      remove: (key) =>
        set((state) => ({ lines: state.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
      openCart: () => set({ open: true }),
      closeCart: () => set({ open: false }),
      toggleCart: () => set((state) => ({ open: !state.open })),
      count: () => get().lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: () => get().lines.reduce((n, l) => n + l.price * l.quantity, 0),
    }),
    {
      name: "alesea-cart",
      // Only persist the bag contents, not the drawer open flag.
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
);
