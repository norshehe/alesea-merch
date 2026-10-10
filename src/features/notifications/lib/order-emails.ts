import type { IOrderNotification } from "@/lib/supabase/order/orderClient";
import type { OrderStatus } from "@/lib/supabase/types/order/response";
import {
  DELIVERY_LABELS,
  PAYMENT_METHOD_COD,
  isDeliveryMethod,
} from "@/features/checkout/schemas/checkout.schema";
import {
  EMAIL_SIGN_OFF,
  EMAIL_STYLE,
  emailButton,
  emailParagraph,
  emailRow,
  emailShell,
  escapeHtml,
} from "@/lib/email/shell";
import { formatManilaDate, formatPrice } from "@/lib/format";

/**
 * Pure builders for the order emails. No I/O — the server module loads the
 * order and decides who gets what; this file only turns an order into
 * `{ subject, text, html }`.
 *
 * Abuse model: checkout is public, so anyone can place an order for ANY
 * address and make us mail it. Buyer emails are therefore built so a stranger
 * cannot use them as a message carrier:
 *  - no customer-typed text in the subject or the opening line (generic
 *    greeting, reference only);
 *  - customer-typed text that must appear (the address block) is escaped AND
 *    has link prefixes stripped, so it doesn't render as a clickable URL;
 *  - delivery and payment are rendered from server constants, never from the
 *    `delivery_label` / `payment_method` request echoes.
 * Links: none in buyer emails (customers never sign in, nothing carries a
 * token). The admin alert links to the session-gated `/admin/orders/<id>`.
 */

export interface IBuiltEmail {
  subject: string;
  text: string;
  html: string;
}

/**
 * Defuse URLs in customer-typed text: drop `http(s)://` and `www.` so mail
 * clients don't auto-link them. Deliberately simple — the goal is "not a
 * clickable link in our email", not URL detection.
 */
function neutralizeLinks(value: string): string {
  return value.replace(/https?:\/\//gi, "").replace(/\bwww\./gi, "");
}

function money(order: IOrderNotification, amount: number): string {
  return formatPrice(amount, order.currency);
}

function deliveryLabel(order: IOrderNotification): string {
  return isDeliveryMethod(order.deliveryMethod)
    ? DELIVERY_LABELS[order.deliveryMethod]
    : "Delivery";
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** "Tee (Sand · M)" — link-neutralised for buyer emails. */
function itemTitle(item: IOrderNotification["items"][number]): string {
  const title = item.variant ? `${item.name} (${item.variant})` : item.name;
  return neutralizeLinks(title);
}

function addressLines(order: IOrderNotification): string[] {
  return [
    order.customerName,
    order.addressLine1,
    order.addressLine2,
    [order.city, order.province, order.postalCode].filter(Boolean).join(", "),
    order.country,
  ]
    .map((line) => neutralizeLinks(line).trim())
    .filter(Boolean);
}

/** Customer-facing contact sentence. Replies go to SENDGRID_REPLY_TO. */
function contactSentence(order: IOrderNotification, contactEmail: string): string {
  const alt = contactEmail ? ` or write to ${contactEmail}` : "";
  return `Questions about your order? Just reply to this email${alt} and mention ${order.reference}.`;
}

/** Totals exactly as stored — i.e. what `place_order` charged. */
function totals(order: IOrderNotification): { label: string; value: string }[] {
  const rows = [
    { label: "Subtotal", value: money(order, order.subtotal) },
    {
      label: "Shipping",
      value: order.shipping > 0 ? money(order, order.shipping) : "Free",
    },
  ];
  if (order.discount > 0) {
    rows.push({ label: "Discount", value: `−${money(order, order.discount)}` });
  }
  rows.push({ label: "Total", value: money(order, order.total) });
  return rows;
}

function join(parts: string[]): string {
  return parts.join("\n    ");
}

// ---------------------------------------------------------------------------
// Buyer: order received
// ---------------------------------------------------------------------------

export function buildOrderConfirmationEmail(
  order: IOrderNotification,
  contactEmail: string,
): IBuiltEmail {
  const placed = formatManilaDate(order.createdAt);
  const total = money(order, order.total);
  const address = addressLines(order);
  const totalRows = totals(order);
  const delivery = deliveryLabel(order);
  const intro = `Thanks for your order. Here's what we received on ${placed} — your order reference is ${order.reference}.`;
  const paymentNote = `Nothing has been charged. Please have ${total} ready to pay when your order arrives. We'll email you again once we've confirmed your order.`;

  const subject = `We've received your order ${order.reference}`;

  const text = [
    intro,
    "",
    `Order ${order.reference}`,
    ...order.items.map(
      (item) =>
        `- ${itemTitle(item)} × ${item.quantity} — ${money(order, item.lineTotal)}`,
    ),
    "",
    ...totalRows.map((row) => `${row.label}: ${row.value}`),
    "",
    `Payment: ${PAYMENT_METHOD_COD}`,
    paymentNote,
    "",
    `Delivery: ${delivery}`,
    ...address,
    "",
    contactSentence(order, contactEmail),
    "",
    EMAIL_SIGN_OFF,
  ].join("\n");

  const html = emailShell(
    "Thanks for your order.",
    join([
      emailParagraph(intro),
      emailParagraph("Your order", EMAIL_STYLE.label),
      ...order.items.map((item) =>
        emailRow(`${itemTitle(item)} × ${item.quantity}`, money(order, item.lineTotal)),
      ),
      ...totalRows.map((row) =>
        emailRow(row.label, row.value, { strong: row.label === "Total" }),
      ),
      emailParagraph("Payment", EMAIL_STYLE.label),
      emailParagraph(
        PAYMENT_METHOD_COD,
        `${EMAIL_STYLE.body}margin-bottom:6px;${EMAIL_STYLE.emphasis}`,
      ),
      emailParagraph(paymentNote),
      emailParagraph("Delivery", EMAIL_STYLE.label),
      emailParagraph(delivery, `${EMAIL_STYLE.body}margin-bottom:6px;${EMAIL_STYLE.emphasis}`),
      `<p style="${EMAIL_STYLE.body}">${address.map(escapeHtml).join("<br />")}</p>`,
      emailParagraph(contactSentence(order, contactEmail), EMAIL_STYLE.small),
    ]),
    { title: subject },
  );

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// Admin: new order alert
// ---------------------------------------------------------------------------

export function buildAdminOrderAlertEmail(
  order: IOrderNotification,
  /** Absolute site origin, or null when NEXT_PUBLIC_SITE_URL is unset. */
  siteUrl: string | null,
): IBuiltEmail {
  const total = money(order, order.total);
  const orderUrl = siteUrl
    ? `${siteUrl.replace(/\/$/, "")}/admin/orders/${encodeURIComponent(order.id)}`
    : null;
  const fallback = "Open it from Orders in the shop admin.";

  const subject = `New order ${order.reference} — ${total}`;

  const details = [
    { label: "Reference", value: order.reference },
    { label: "Customer", value: order.customerName },
    { label: "Email", value: order.email },
    { label: "Phone", value: order.phone || "—" },
    { label: "Items", value: String(order.itemCount) },
    { label: "Delivery", value: deliveryLabel(order) },
    { label: "Payment", value: PAYMENT_METHOD_COD },
    { label: "Total", value: total },
  ];

  const text = [
    `New order ${order.reference} — ${plural(order.itemCount, "item")}, ${total}.`,
    "",
    ...details.map((row) => `${row.label}: ${row.value}`),
    "",
    orderUrl ? `Open it: ${orderUrl}` : fallback,
    "",
    EMAIL_SIGN_OFF,
  ].join("\n");

  const html = emailShell(
    `New order ${order.reference}`,
    join([
      emailParagraph(
        `${plural(order.itemCount, "item")}, ${total}. It's waiting in the admin.`,
      ),
      ...details.map((row) =>
        emailRow(row.label, row.value, { strong: row.label === "Total" }),
      ),
      orderUrl
        ? `<p style="margin:28px 0 0;">${emailButton(orderUrl, "Open the order")}</p>`
        : emailParagraph(fallback),
      emailParagraph(
        "You're getting this because you're an admin of the Alesea shop.",
        EMAIL_STYLE.small,
      ),
    ]),
    { title: subject },
  );

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// Buyer: status changes
// ---------------------------------------------------------------------------

/** The transitions a customer hears about. `pending`/`packed` are internal. */
export const NOTIFIABLE_STATUSES = [
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const satisfies readonly OrderStatus[];

export type NotifiableStatus = (typeof NOTIFIABLE_STATUSES)[number];

export function isNotifiableStatus(status: OrderStatus): status is NotifiableStatus {
  return (NOTIFIABLE_STATUSES as readonly OrderStatus[]).includes(status);
}

/**
 * Statuses after which the customer may already have paid the courier. A
 * cancellation from one of these must not say "nothing has been charged".
 */
const POSSIBLY_PAID = new Set<OrderStatus>(["shipped", "delivered", "refunded"]);

interface IStatusCopy {
  subject: string;
  heading: string;
  body: string;
}

function statusCopy(
  status: NotifiableStatus,
  previous: OrderStatus,
  order: IOrderNotification,
): IStatusCopy {
  const ref = order.reference;
  const total = money(order, order.total);

  switch (status) {
    case "confirmed":
      return {
        subject: `Order ${ref} has been confirmed`,
        heading: "Your order is confirmed.",
        body: `We've confirmed your order and are getting it ready. Please have ${total} ready to pay when it arrives.`,
      };
    case "shipped":
      return {
        subject: `Order ${ref} has been shipped`,
        heading: "Your order is on its way.",
        body: `Your order has left us and is with the courier. Please have ${total} ready to pay on delivery.`,
      };
    case "delivered":
      return {
        subject: `Order ${ref} has been delivered`,
        heading: "Your order has been delivered.",
        body: "Thank you for shopping with Alesea — we hope you love it.",
      };
    case "cancelled":
      return {
        subject: `Order ${ref} has been cancelled`,
        heading: "Your order has been cancelled.",
        body: POSSIBLY_PAID.has(previous)
          ? "If you've already paid for this order, reply to this email and we'll arrange the next steps with you."
          : "Nothing has been charged, so there's nothing more you need to do. If you didn't expect this, reply to this email and we'll help.",
      };
    case "refunded":
      return {
        subject: `Order ${ref} has been refunded`,
        heading: "Your order has been refunded.",
        body: `We've processed a refund for your order of ${total}. We'll be in touch about how the refund reaches you.`,
      };
  }
}

export function buildOrderStatusEmail(
  order: IOrderNotification,
  status: NotifiableStatus,
  previous: OrderStatus,
  contactEmail: string,
): IBuiltEmail {
  const copy = statusCopy(status, previous, order);
  const total = money(order, order.total);
  const summary = `Order ${order.reference} — ${plural(order.itemCount, "item")}, ${total}`;

  const text = [
    copy.body,
    "",
    summary,
    ...order.items.map((item) => `- ${itemTitle(item)} × ${item.quantity}`),
    "",
    contactSentence(order, contactEmail),
    "",
    EMAIL_SIGN_OFF,
  ].join("\n");

  const html = emailShell(
    copy.heading,
    join([
      emailParagraph(copy.body),
      emailParagraph(`Order ${order.reference}`, EMAIL_STYLE.label),
      ...order.items.map((item) => emailRow(`${itemTitle(item)} × ${item.quantity}`, null)),
      emailRow("Total", total, { strong: true }),
      emailParagraph(contactSentence(order, contactEmail), EMAIL_STYLE.small),
    ]),
    { title: copy.subject },
  );

  return { subject: copy.subject, text, html };
}
