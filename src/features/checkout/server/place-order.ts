"use server";

import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  createOrder,
  type IOrderAmounts,
} from "@/lib/supabase/order/orderClient";
import { placeOrderInputSchema } from "@/features/checkout/schemas/checkout.schema";

/**
 * One requested line.
 *
 * `unitPrice` and `lineTotal` are ADVISORY — what the browser displayed. The
 * `place_order` RPC prices every line from `products` and ignores them.
 */
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

/**
 * `amounts` is what the ORDER WAS ACTUALLY CHARGED, priced by the database.
 * If it disagrees with the client's own arithmetic, the client is wrong: show
 * these numbers on the confirmation, not the ones the cart computed.
 */
type PlaceOrderResult =
  | { ok: true; reference: string; amounts: IOrderAmounts }
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
 *
 * TWO layers of distrust, both required:
 *
 *  1. This is a `"use server"` action, so it is a public HTTP endpoint that any
 *     payload can reach — the client-side form schema constrains a form, not a
 *     request. Everything is re-parsed here.
 *  2. Even a well-formed request cannot be believed about MONEY. Payment is
 *     cash on delivery, so the stored row is the only record of what is owed;
 *     `place_order` therefore re-prices every line from `products` and ignores
 *     the amounts below. They are forwarded purely so the request records what
 *     the customer was shown.
 */
export async function placeOrder(
  input: IPlaceOrderInput,
): Promise<PlaceOrderResult> {
  const parsed = placeOrderInputSchema.safeParse(input);
  if (!parsed.success) {
    // Nothing here is reachable from the real checkout form, which validates
    // the same fields first — so a failure is a malformed or hostile request
    // and gets no field-level detail back.
    console.warn("[orders] Rejected malformed order payload");
    return {
      ok: false,
      error: "We couldn't place your order. Please check your details and try again.",
    };
  }
  const order = parsed.data;

  const itemCount = order.lines.reduce((sum, line) => sum + line.quantity, 0);

  if (!isSupabaseAdminConfigured()) {
    console.warn("[orders] Supabase not configured — order not persisted");
    return {
      ok: true,
      reference: demoOrderRef(),
      // Nothing is stored, so there is no server price to report. Echoing the
      // client's own numbers keeps the demo panel rendering the same shape.
      amounts: {
        itemCount,
        subtotal: order.subtotal,
        shipping: order.shippingCost,
        discount: order.discount,
        total: order.total,
        currency: order.currency,
      },
    };
  }

  try {
    const result = await createOrder({
      customerName: `${order.shipping.first} ${order.shipping.last}`,
      email: order.contact.email,
      phone: order.contact.phone,
      addressLine1: order.shipping.address,
      addressLine2: order.shipping.address2,
      city: order.shipping.city,
      province: order.shipping.province,
      postalCode: order.shipping.zip,
      country: order.shipping.country,
      deliveryMethod: order.deliveryMethod,
      deliveryLabel: order.deliveryLabel,
      paymentMethod: order.paymentMethod,
      itemCount,
      subtotal: order.subtotal,
      shipping: order.shippingCost,
      discount: order.discount,
      total: order.total,
      currency: order.currency,
      lines: order.lines.map((line) => ({
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

    return { ok: true, reference: result.reference, amounts: result.amounts };
  } catch (error) {
    console.error("[orders] Failed to persist order to Supabase:", error);
    return {
      ok: false,
      error: "We couldn't place your order. Please try again.",
    };
  }
}
