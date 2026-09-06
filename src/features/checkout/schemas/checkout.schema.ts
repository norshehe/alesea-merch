import { z } from "zod";

export const DELIVERY_METHODS = ["standard", "express"] as const;

export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const checkoutSchema = z.object({
  // Contact
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  phone: z.string().optional(),
  // Shipping address
  first: z.string().min(1, "First name is required"),
  last: z.string().min(1, "Last name is required"),
  address: z.string().min(1, "Street address is required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province is required"),
  zip: z.string().min(1, "Postal code is required"),
  // Delivery
  delivery: z.enum(DELIVERY_METHODS),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

/**
 * Server-side guard for the `placeOrder` action.
 *
 * The form schema above validates a FORM. This one validates a REQUEST: a
 * `"use server"` action is a public endpoint, reachable with any payload, and
 * the browser's copy of the schema is advice rather than enforcement.
 *
 * Money is deliberately loose here — `place_order` re-prices every line from
 * `products` and `site_settings` and ignores whatever arrives, so these fields
 * only need to be finite numbers to survive serialisation. What IS tightly
 * bounded is anything the database stores verbatim (lengths) or acts on
 * (quantities, delivery method).
 */

/** Per-line cap. Above this it is not a bag, it is a wholesale order. */
export const MAX_LINE_QUANTITY = 99;

/** Distinct-variant cap, so a single request cannot fan out unboundedly. */
export const MAX_ORDER_LINES = 60;

/** An amount the client computed. Retained for logging only; never trusted. */
const advisoryAmount = z.number().finite().min(0).max(100_000_000);

const placeOrderLineSchema = z.object({
  // Same shape as products_slug_format in 0002 — an unknown slug is rejected by
  // `place_order` anyway, but there is no reason to send it a malformed one.
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  // Display fields. The database now derives its own snapshots from the
  // product, so these are inert; they stay in the payload for the action's log.
  name: z.string().trim().max(200),
  color: z.string().trim().max(80),
  size: z.string().trim().max(80),
  variant: z.string().trim().max(160),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
  unitPrice: advisoryAmount,
  lineTotal: advisoryAmount,
});

export const placeOrderInputSchema = z.object({
  contact: z.object({
    email: z.string().trim().min(1).max(254).email(),
    phone: z.string().trim().max(40).optional(),
  }),
  shipping: z.object({
    first: z.string().trim().min(1).max(80),
    last: z.string().trim().min(1).max(80),
    address: z.string().trim().min(1).max(200),
    address2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(1).max(80),
    province: z.string().trim().min(1).max(80),
    zip: z.string().trim().min(1).max(20),
    country: z.string().trim().min(1).max(80),
  }),
  // Enum, not string: this selects the shipping rate the database charges.
  deliveryMethod: z.enum(DELIVERY_METHODS),
  deliveryLabel: z.string().trim().max(80),
  paymentMethod: z.string().trim().max(80),
  lines: z.array(placeOrderLineSchema).min(1).max(MAX_ORDER_LINES),
  subtotal: advisoryAmount,
  shippingCost: advisoryAmount,
  discount: advisoryAmount,
  total: advisoryAmount,
  currency: z.string().trim().regex(/^[A-Z]{3}$/),
});

export type PlaceOrderInputValues = z.infer<typeof placeOrderInputSchema>;
