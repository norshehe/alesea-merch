"use server";

import { requireAdmin } from "@/features/admin/server/auth";
import {
  firstIssue,
  notWrittenMessage,
  toActionMessage,
  type ActionResult,
} from "@/features/admin/server/action-result";
import { revalidateStorefrontProducts } from "@/features/admin/server/revalidate";
import {
  updateOrderNotesSchema,
  updateOrderStatusSchema,
  type OrderStatus,
} from "@/features/admin/orders/schemas/order.schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Write path for orders. Every export starts with `requireAdmin()` — RLS is the
 * real gate, but an unauthenticated caller should get a redirect, not a
 * confusing permission error from Postgres.
 *
 * Only two things are writable: `status` and `notes`. Amounts, addresses and
 * line items are the customer's record of what they asked for and what they
 * were quoted, so there is no action that touches them.
 *
 * ⚠️ Stock is NOT moved here. `sync_order_stock()` (migration 0005) fires on the
 * status update, inside the same transaction, and owns the arithmetic. This
 * file only observes `stock_reserved` before and after so the UI can say what
 * happened.
 */

/**
 * No constraint map: the only named constraint on `orders` is
 * `orders_reference_key`, which nothing on this write path can trip — status
 * and notes are the only writable columns. `sync_order_stock()` raises P0001,
 * which `toActionMessage` passes through in the trigger's own words.
 */
function toMessage(error: unknown, fallback: string): string {
  return toActionMessage(error, fallback);
}

/**
 * Move an order to a new status.
 *
 * Whether stock moved is REPORTED, not decided: the trigger compares old and
 * new status and flips `stock_reserved` itself, so re-reading the row is the
 * only honest answer.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<
  ActionResult<{
    status: OrderStatus;
    /** What the trigger did, as observed from `stock_reserved`. */
    stockMoved: "released" | "reserved" | null;
  }>
> {
  await requireAdmin();

  // The client schema is a UX affordance, not a security boundary — re-parse.
  const parsed = updateOrderStatusSchema.safeParse({ orderId, status });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssue(parsed.error.issues, "That change could not be applied."),
    };
  }

  const supabase = await createSupabaseServerClient();

  try {
    const { data: before, error: readError } = await supabase
      .from("orders")
      .select("status, stock_reserved")
      .eq("id", parsed.data.orderId)
      .maybeSingle();
    if (readError) throw readError;
    if (!before) return { ok: false, error: "That order no longer exists." };

    // The trigger only fires when the status actually changes; short-circuit so
    // a double-click cannot report a phantom transition.
    if (before.status === parsed.data.status) {
      return { ok: true, status: before.status, stockMoved: null };
    }

    // `.select()` without `.single()`: PostgREST reports NO error when an
    // UPDATE matches nothing, and an RLS-denied write IS a zero-row write — a
    // revoked admin row or an expired session would otherwise report success.
    const { data: rows, error } = await supabase
      .from("orders")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.orderId)
      .select("status, stock_reserved");
    if (error) throw error;
    if (!rows || rows.length === 0) {
      return { ok: false, error: notWrittenMessage("order") };
    }

    const after = rows[0];
    const stockMoved =
      before.stock_reserved === after.stock_reserved
        ? null
        : after.stock_reserved
          ? ("reserved" as const)
          : ("released" as const);

    // Only a transition that crossed into or out of cancelled/refunded touched
    // inventory, and inventory is the ONLY part of an order the storefront
    // renders. pending → shipped changes nothing a customer can see.
    // Every product page also carries a strip of the other products, so a
    // stock move is never local to the slugs on this order.
    if (stockMoved !== null) {
      revalidateStorefrontProducts();
    }

    return { ok: true, status: after.status, stockMoved };
  } catch (error) {
    console.error("[admin-orders] status change failed", error);
    return {
      ok: false,
      error: toMessage(error, "Could not change the order status."),
    };
  }
}

/**
 * Save the shop's own annotation on an order.
 *
 * Deliberately revalidates NOTHING: orders are not public, notes are never
 * rendered on the storefront, and no trigger fires on this column. The status
 * action revalidates only because it can move stock.
 */
export async function updateOrderNotes(
  orderId: string,
  notes: string,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = updateOrderNotesSchema.safeParse({ orderId, notes });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssue(parsed.error.issues, "That change could not be applied."),
    };
  }

  const supabase = await createSupabaseServerClient();

  try {
    const { data, error } = await supabase
      .from("orders")
      .update({ notes: parsed.data.notes })
      .eq("id", parsed.data.orderId)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      return { ok: false, error: notWrittenMessage("order") };
    }

    return { ok: true };
  } catch (error) {
    console.error("[admin-orders] notes save failed", error);
    return { ok: false, error: toMessage(error, "Could not save these notes.") };
  }
}
