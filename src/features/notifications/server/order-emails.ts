import "server-only";
import { after } from "next/server";
import { isSendGridConfigured, sendEmail } from "@/lib/sendgrid";
import {
  claimOrderNotification,
  countRecentOrdersForEmail,
  getOrderForNotification,
  releaseOrderNotification,
  type IOrderNotification,
  type OrderNotificationKind,
} from "@/lib/supabase/order/orderClient";
import type { OrderStatus } from "@/lib/supabase/types/order/response";
import {
  listAdminRecipients,
  type IAdminRecipient,
} from "@/lib/supabase/adminUser/adminUserClient";
import { getSiteSettingsFromSupabase } from "@/lib/supabase/siteSettings/siteSettingsClient";
import {
  buildAdminOrderAlertEmail,
  buildOrderConfirmationEmail,
  buildOrderStatusEmail,
  isNotifiableStatus,
} from "@/features/notifications/lib/order-emails";

/**
 * Transactional order emails: buyer confirmation, admin new-order alert, and
 * buyer status updates.
 *
 * Delivery contract — every `schedule*` export:
 *  - returns immediately and NEVER throws. The order (or status change) has
 *    already been committed by the time these run; an email problem must not
 *    turn a placed order into an error on the checkout page.
 *  - does the work inside `after()`, so neither checkout nor the admin action
 *    waits on Supabase reads or SendGrid round trips.
 *  - re-reads the order by id with the service role. The amounts mailed are
 *    the stored ones — what `place_order` charged — never the client's.
 *  - sends nothing unless `ORDER_EMAILS_SEND === "true"` AND SendGrid is
 *    configured (one warning per server instance otherwise).
 *
 * Exactly-once: each email first claims `(order_id, kind)` in
 * `order_notifications` (migration 0013). Only the claimant sends; a failed
 * send releases the claim so a later attempt can retry.
 *
 * Abuse throttle: checkout is public and takes any address, so a stranger
 * could use it to make us mail someone. Past `MAX_ORDERS_PER_ADDRESS_PER_HOUR`
 * orders for one address, the order still lands but no emails go out for it.
 *
 * NO CUSTOMER EMAIL ADDRESS, NAME OR ADDRESS IS EVER LOGGED. Logs identify the
 * order by reference/id and admins by user id — the same rule as
 * `back-in-stock.ts`.
 */

const TAG = "[order-emails]";

/** Orders per address per hour that still get emails (the 4th does not). */
const MAX_ORDERS_PER_ADDRESS_PER_HOUR = 3;

const warned = new Set<string>();

/** Log a configuration warning once per server instance. */
function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`${TAG} ${message}`);
}

/** True when sends are armed and possible. */
function canSend(): boolean {
  if (process.env.ORDER_EMAILS_SEND !== "true") {
    warnOnce(
      "unarmed",
      'Order emails are off — set ORDER_EMAILS_SEND="true" to send them.',
    );
    return false;
  }
  if (!isSendGridConfigured()) {
    warnOnce(
      "unconfigured",
      "SendGrid is not configured — order emails are disabled. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL.",
    );
    return false;
  }
  return true;
}

/** Error text without the payload — SendGrid errors never need the address. */
function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Absolute origin for admin links, or null rather than a guessed host. */
function siteUrl(): string | null {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || null;
}

/**
 * The shop's public contact address, for the "questions?" line. Optional:
 * the line still works without it ("just reply to this email").
 */
async function contactEmail(): Promise<string> {
  try {
    const settings = await getSiteSettingsFromSupabase();
    return settings?.contactEmail.trim() ?? "";
  } catch (error) {
    console.warn(`${TAG} could not read site settings for the contact line:`, describe(error));
    return "";
  }
}

/** Load an order, logging (by id) instead of throwing. */
async function loadOrder(orderId: string): Promise<IOrderNotification | null> {
  try {
    const order = await getOrderForNotification(orderId);
    if (!order) console.error(`${TAG} order ${orderId} not found — no email sent.`);
    return order;
  } catch (error) {
    console.error(`${TAG} could not load order ${orderId} — no email sent:`, describe(error));
    return null;
  }
}

/**
 * Wrap `after()` so that scheduling itself can never throw into the caller.
 * (`after` throws outside a request scope; the callers here are always inside
 * one, but the order is already committed, so belt and braces.)
 */
function schedule(label: string, task: () => Promise<void>): void {
  try {
    after(async () => {
      try {
        await task();
      } catch (error) {
        console.error(`${TAG} ${label} failed:`, describe(error));
      }
    });
  } catch (error) {
    console.error(`${TAG} could not schedule ${label}:`, describe(error));
  }
}

/**
 * Claim → send → release-on-failure. `send` resolves to true when the email
 * went out (for fan-outs: when at least one recipient got it).
 */
async function sendOnce(
  order: IOrderNotification,
  kind: OrderNotificationKind,
  send: () => Promise<boolean>,
): Promise<void> {
  let claimed: boolean;
  try {
    claimed = await claimOrderNotification(order.id, kind);
  } catch (error) {
    // Without a claim there is no exactly-once guarantee — skip, don't risk a
    // duplicate.
    console.error(
      `${TAG} could not claim ${kind} for ${order.reference} — not sent:`,
      describe(error),
    );
    return;
  }
  if (!claimed) return; // Already sent, or being sent by another invocation.

  if (await send()) return;

  try {
    await releaseOrderNotification(order.id, kind);
  } catch (error) {
    console.error(
      `${TAG} could not release the ${kind} claim for ${order.reference} — it will not be retried:`,
      describe(error),
    );
  }
}

/**
 * True when this address has had more orders in the last hour than we will
 * email about. Fails OPEN: a lookup error must not cost a real customer their
 * receipt, and an attacker cannot cause one.
 */
async function isThrottled(order: IOrderNotification): Promise<boolean> {
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const count = await countRecentOrdersForEmail(order.email, since);
    return count > MAX_ORDERS_PER_ADDRESS_PER_HOUR;
  } catch (error) {
    console.error(
      `${TAG} throttle check failed for ${order.reference} — sending anyway:`,
      describe(error),
    );
    return false;
  }
}

async function sendBuyerConfirmation(order: IOrderNotification): Promise<void> {
  const email = buildOrderConfirmationEmail(order, await contactEmail());
  await sendOnce(order, "placed", async () => {
    try {
      await sendEmail({ to: order.email, ...email, transactional: true });
      return true;
    } catch (error) {
      console.error(`${TAG} confirmation for ${order.reference} failed:`, describe(error));
      return false;
    }
  });
}

async function sendAdminAlerts(order: IOrderNotification): Promise<void> {
  let recipients: IAdminRecipient[];
  try {
    recipients = await listAdminRecipients();
  } catch (error) {
    console.error(
      `${TAG} could not list admins for ${order.reference} — no alert sent:`,
      describe(error),
    );
    return;
  }
  if (recipients.length === 0) {
    console.warn(`${TAG} no admins to alert about ${order.reference}.`);
    return;
  }

  const email = buildAdminOrderAlertEmail(order, siteUrl());

  await sendOnce(order, "admin_alert", async () => {
    // One send per recipient (as `sendEmail` intends): a bad address fails alone.
    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        sendEmail({ to: recipient.email, ...email, transactional: true }),
      ),
    );
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `${TAG} admin alert for ${order.reference} to admin ${recipients[index].id} failed:`,
          describe(result.reason),
        );
      }
    });
    // Release only if nobody got it — a retry would re-mail the ones who did.
    return results.some((result) => result.status === "fulfilled");
  });
}

/**
 * After `place_order` succeeds: confirm to the buyer and alert every admin.
 *
 * Call ONLY for a persisted order — the demo/no-Supabase branch of checkout
 * has no row to read and must send nothing.
 */
export function scheduleOrderPlacedEmails(order: {
  id: string;
  reference: string;
}): void {
  if (!canSend()) return;

  schedule(`order-placed emails for ${order.reference}`, async () => {
    const loaded = await loadOrder(order.id);
    if (!loaded) return;

    if (await isThrottled(loaded)) {
      // The order is real and visible in the admin; only the mail is held back.
      console.warn(
        `${TAG} ${loaded.reference}: too many orders for this address in the last hour — confirmation and admin alert not sent.`,
      );
      return;
    }

    await Promise.all([sendBuyerConfirmation(loaded), sendAdminAlerts(loaded)]);
  });
}

/**
 * After an admin's status change lands: tell the buyer, for the transitions
 * they care about. `pending` and `packed` are internal and send nothing.
 *
 * The caller must only invoke this when the status ACTUALLY changed, and pass
 * the status it changed FROM — the cancellation copy depends on it.
 */
export function scheduleOrderStatusEmail(
  orderId: string,
  status: OrderStatus,
  previous: OrderStatus,
): void {
  if (!isNotifiableStatus(status)) return;
  if (!canSend()) return;

  schedule(`${status} email for order ${orderId}`, async () => {
    const order = await loadOrder(orderId);
    if (!order) return;

    // Superseded by a later customer-facing status before this ran (e.g. a
    // mis-clicked "cancelled" corrected to "confirmed"): that change mails its
    // own email. A later INTERNAL status (packed) doesn't — still send this one.
    if (order.status !== status && isNotifiableStatus(order.status)) {
      console.info(
        `${TAG} ${order.reference} is now ${order.status} — skipping the ${status} email.`,
      );
      return;
    }

    const email = buildOrderStatusEmail(order, status, previous, await contactEmail());
    await sendOnce(order, status, async () => {
      try {
        await sendEmail({ to: order.email, ...email, transactional: true });
        return true;
      } catch (error) {
        console.error(
          `${TAG} ${status} email for ${order.reference} failed:`,
          describe(error),
        );
        return false;
      }
    });
  });
}
