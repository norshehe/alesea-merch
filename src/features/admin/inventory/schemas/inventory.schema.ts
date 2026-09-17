import { z } from "zod";

/**
 * Mirrors the shape and CHECKs of `public.inventory` in
 * `supabase/migrations/0002_products.sql`.
 *
 * `stock: null` is NOT zero — it means "stop tracking this variant", which the
 * action turns into a DELETE. Zero means "sold out" and is a real row. The
 * asymmetry is the whole point of the sparse table.
 */
export const inventoryCellSchema = z.object({
  /** `''` when the product has no colour axis — that is a valid key, not a gap. */
  color: z.string(),
  /** `''` when the product has no size axis. */
  size: z.string(),
  stock: z
    .number()
    .int("Stock must be a whole number.")
    // `stock >= 0` in the DB; failing here gives a sentence instead of a 500.
    .min(0, "Stock cannot be negative.")
    .nullable(),
});

export const saveInventorySchema = z.object({
  productId: z.string().uuid("That product no longer exists."),
  /** Only the DIRTY cells are ever sent — never the whole grid. */
  cells: z.array(inventoryCellSchema).min(1, "Nothing to save."),
});

export type InventoryCell = z.infer<typeof inventoryCellSchema>;
