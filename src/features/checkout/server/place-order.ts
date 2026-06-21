"use server";

import {
  createAirtableRecord,
  isAirtableConfigured,
} from "@/lib/airtable";
import { formatPrice } from "@/lib/format";
import { generateOrderRef } from "@/features/checkout/lib/order-ref";

export interface IPlaceOrderLine {
  name: string;
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

function buildItemsString(lines: IPlaceOrderLine[], currency: string): string {
  return lines
    .map(
      (line) =>
        `${line.quantity}× ${line.name} (${line.variant}) — ${formatPrice(
          line.lineTotal,
          currency,
        )}`,
    )
    .join("\n");
}

function buildAddress(shipping: IPlaceOrderInput["shipping"]): string {
  const parts = [
    shipping.address,
    shipping.address2?.trim() ? shipping.address2 : null,
    `${shipping.city}, ${shipping.province} ${shipping.zip}`,
    shipping.country,
  ];
  return parts.filter(Boolean).join("\n");
}

/**
 * Persist a sales order to Airtable and return its reference.
 *
 * No payment is processed — this is order tracking only. When Airtable is not
 * configured the order is not persisted but the call still succeeds so local
 * and demo environments complete the flow.
 */
export async function placeOrder(
  input: IPlaceOrderInput,
): Promise<PlaceOrderResult> {
  const reference = generateOrderRef();

  const itemCount = input.lines.reduce((sum, line) => sum + line.quantity, 0);

  const fields: Record<string, unknown> = {
    Reference: reference,
    Status: "Pending",
    "Customer Name": `${input.shipping.first} ${input.shipping.last}`,
    Email: input.contact.email,
    Phone: input.contact.phone ?? "",
    Address: buildAddress(input.shipping),
    "Delivery Method": input.deliveryLabel,
    "Payment Method": input.paymentMethod,
    Items: buildItemsString(input.lines, input.currency),
    "Item Count": itemCount,
    Subtotal: input.subtotal,
    Shipping: input.shippingCost,
    Discount: input.discount,
    Total: input.total,
    Currency: input.currency,
  };

  if (!isAirtableConfigured()) {
    console.warn("[orders] Airtable not configured — order not persisted");
    return { ok: true, reference };
  }

  try {
    await createAirtableRecord(fields);
    return { ok: true, reference };
  } catch (error) {
    console.error("[orders] Failed to persist order to Airtable:", error);
    return {
      ok: false,
      error: "We couldn't place your order. Please try again.",
    };
  }
}
