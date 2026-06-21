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
