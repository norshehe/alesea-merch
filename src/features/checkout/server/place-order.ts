"use server";

import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createOrder } from "@/lib/supabase/order/orderClient";

export interface IPlaceOrderLine {
  slug: string;
  name: string;
  color: string;
  size: string;
  /** Display form of `color`/`size`, e.g. "Sand · M". */
  variant: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface IPlaceOrderInput {
  contact: {
    email: string;
    phone?: string;
  };
  shipping: {
    first: string;
    last: string;
    address: string;
    address2?: string;
    city: string;
    province: string;
    zip: string;
    country: string;
  };
  deliveryMethod: string;
  deliveryLabel: string;
  paymentMethod: string;
  lines: IPlaceOrderLine[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  currency: string;
}

type PlaceOrderResult =
  | { ok: true; reference: string }
  | { ok: false; error: string };

/** Reference shown in the local/demo success panel, where nothing is persisted. */
function demoOrderRef(): string {
  return `ALS-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

/**
 * Persist a sales order and return its reference.
 *
 * No payment is processed — this is order tracking only. The write goes through
 * `place_order`, which also reserves stock, so the reference comes back from the
 * database rather than being generated here. When Supabase is not configured the
 * order is not persisted but the call still succeeds so local and demo
 * environments complete the flow.
 */
export async function placeOrder(
  input: IPlaceOrderInput,
): Promise<PlaceOrderResult> {
  const itemCount = input.lines.reduce((sum, line) => sum + line.quantity, 0);

  if (!isSupabaseAdminConfigured()) {
    console.warn("[orders] Supabase not configured — order not persisted");
    return { ok: true, reference: demoOrderRef() };
  }

  try {
    const result = await createOrder({
      customerName: `${input.shipping.first} ${input.shipping.last}`,
      email: input.contact.email,
      phone: input.contact.phone,
      addressLine1: input.shipping.address,
      addressLine2: input.shipping.address2,
      city: input.shipping.city,
      province: input.shipping.province,
      postalCode: input.shipping.zip,
      country: input.shipping.country,
      deliveryMethod: input.deliveryMethod,
      deliveryLabel: input.deliveryLabel,
      paymentMethod: input.paymentMethod,
      itemCount,
      subtotal: input.subtotal,
      shipping: input.shippingCost,
      discount: input.discount,
      total: input.total,
      currency: input.currency,
      lines: input.lines.map((line) => ({
        slug: line.slug,
        name: line.name,
        color: line.color,
        size: line.size,
        variantLabel: line.variant,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      })),
    });

    if (!result.ok) {
      // Stock ran out between browsing and submitting. Name the product so the
      // customer knows which line to remove; the raw SQL error stays in the log.
      return {
        ok: false,
        error: `Sorry — ${result.outOfStock} just sold out. Please remove it from your bag and try again.`,
      };
    }

    return { ok: true, reference: result.reference };
  } catch (error) {
    console.error("[orders] Failed to persist order to Supabase:", error);
    return {
      ok: false,
      error: "We couldn't place your order. Please try again.",
    };
  }
}
