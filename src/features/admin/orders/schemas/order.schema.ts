import { z } from "zod";

/**
 * Mirrors the `order_status` enum and the editable columns of `public.orders`
 * in `supabase/migrations/0005_orders.sql`.
 *
 * Orders are READ + STATUS ONLY. There is no create, and amounts, addresses and
 * line items are never editable: an order is the customer's record of what they
 * asked for and what they were quoted. `notes` is the single exception — it is
 * the shop's own annotation, not part of that record.
 */

/** Source order matters: the status Select renders them in this sequence. */
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orderStatusSchema = z.enum(ORDER_STATUSES);

/** `notes` is `text` with no CHECK; the cap is a sanity bound, not a DB rule. */
export const ORDER_NOTES_MAX = 2000;

export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid("That order no longer exists."),
  status: orderStatusSchema,
});

export const updateOrderNotesSchema = z.object({
  orderId: z.string().uuid("That order no longer exists."),
  notes: z
    .string()
    .max(ORDER_NOTES_MAX, `Keep notes under ${ORDER_NOTES_MAX} characters.`),
});

export type UpdateOrderNotesValues = z.infer<typeof updateOrderNotesSchema>;
