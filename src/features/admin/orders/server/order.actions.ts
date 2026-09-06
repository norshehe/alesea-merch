"use server";

import { requireAdmin } from "@/features/admin/server/auth";
import { revalidateProduct } from "@/features/admin/server/revalidate";
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

type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : T))
  | { ok: false; error: string };

interface IPostgresError {
  code?: string;
  message: string;
}

function isPostgresError(error: unknown): error is IPostgresError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

/**
 * Translate a database error into something an operator can act on. The raw
 * error is logged, never returned — it carries SQL and column names.
 */
function toMessage(error: unknown, fallback: string): string {
  if (!isPostgresError(error)) return fallback;

  if (error.code === "22P02") return "That order no longer exists.";
  if (error.code === "23514") {
    // The stock trigger clamps at zero, so this can only be an orders CHECK.
    return "That change breaks a database rule on this order.";
  }

  return fallback;
}

/** Zod issue → the sentence the operator sees. */
function firstIssue(issues: { message: string }[]): string {
  return issues[0]?.message ?? "That change could not be applied.";
}

/**
 * Storefront pages that render stock for the products in this order.
 *
 * Slugs come from `order_items`, not from a join to `products`: the item row is
 * the durable record and its `product_id` may already be null.
 */
async function revalidateOrderProducts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  orderId: string,
) {
  const { data, error } = await supabase
    .from("order_items")
    .select("slug")
    .eq("order_id", orderId);

  if (error) {
    // The status change already committed. A stale cache is a nuisance; an
    // error here would wrongly tell the operator the change failed.
    console.error("[admin-orders] revalidation lookup failed", error);
    return;
  }

  const slugs = new Set(
    (data ?? []).map((row) => row.slug).filter((slug) => slug.length > 0),
  );
  for (const slug of slugs) revalidateProduct(slug);
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
    return { ok: false, error: firstIssue(parsed.error.issues) };
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

    const { data: after, error } = await supabase
      .from("orders")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.orderId)
      .select("status, stock_reserved")
      .single();
    if (error) throw error;

    const stockMoved =
      before.stock_reserved === after.stock_reserved
        ? null
        : after.stock_reserved
          ? ("reserved" as const)
          : ("released" as const);

    // Only a transition that crossed into or out of cancelled/refunded touched
    // inventory, and inventory is the ONLY part of an order the storefront
    // renders. pending → shipped changes nothing a customer can see.
    if (stockMoved !== null) {
      await revalidateOrderProducts(supabase, parsed.data.orderId);
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
    return { ok: false, error: firstIssue(parsed.error.issues) };
  }

  const supabase = await createSupabaseServerClient();

  try {
    const { data, error } = await supabase
      .from("orders")
      .update({ notes: parsed.data.notes })
      .eq("id", parsed.data.orderId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, error: "That order no longer exists." };

    return { ok: true };
  } catch (error) {
    console.error("[admin-orders] notes save failed", error);
    return { ok: false, error: toMessage(error, "Could not save these notes.") };
  }
}
