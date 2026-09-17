import type { badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import type { OrderStatus } from "@/features/admin/orders/schemas/order.schema";

/**
 * Presentation and the *explanation* of what a status change does to stock.
 *
 * ⚠️ Nothing here computes stock. The `sync_order_stock` trigger in
 * `supabase/migrations/0005_orders.sql` owns the arithmetic, holds the lock and
 * runs in the same transaction as the status update. This module only mirrors
 * the trigger's IF conditions so the admin can be told, in one sentence, what
 * is about to happen. Re-implementing the maths in TypeScript would give two
 * sources of truth and one of them would be wrong.
 */

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/**
 * The two statuses the trigger treats as "the goods went back on sale".
 * Everything else is an ACTIVE status and holds the reservation.
 */
const RELEASED_STATUSES = new Set<OrderStatus>(["cancelled", "refunded"]);

export function isReleasedStatus(status: OrderStatus): boolean {
  return RELEASED_STATUSES.has(status);
}

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/**
 * Neutral while it waits, progressively more solid as it moves, green once
 * delivered, destructive once the sale is undone.
 */
export const ORDER_STATUS_BADGE: Record<
  OrderStatus,
  { variant: BadgeVariant; className?: string }
> = {
  pending: { variant: "outline" },
  confirmed: { variant: "secondary" },
  packed: { variant: "secondary" },
  shipped: { variant: "default" },
  delivered: {
    variant: "default",
    // The one custom colour: "done" has to read differently from "in flight",
    // and the badge palette has no success variant.
    className: "bg-emerald-600 text-white dark:bg-emerald-500",
  },
  cancelled: { variant: "destructive" },
  refunded: { variant: "destructive" },
};

/** What a pending status change will do to inventory, if anything. */
export interface IStockConsequence {
  /** `none` means the reservation simply carries over — the common case. */
  kind: "release" | "reserve" | "none";
  /** One line for the operator, or null when stock does not move. */
  message: string | null;
}

function items(count: number): string {
  return `${count} item${count === 1 ? "" : "s"}`;
}

/**
 * Mirror of `sync_order_stock()`'s two branches, including the
 * `stock_reserved` guards that stop a release or a re-reservation from
 * double-applying.
 */
export function stockConsequence(
  from: OrderStatus,
  to: OrderStatus,
  itemCount: number,
  stockReserved: boolean,
): IStockConsequence {
  const wasReleased = isReleasedStatus(from);
  const isReleased = isReleasedStatus(to);

  if (!wasReleased && isReleased && stockReserved) {
    return {
      kind: "release",
      message: `Returns ${items(itemCount)} to stock.`,
    };
  }

  if (wasReleased && !isReleased && !stockReserved) {
    return {
      kind: "reserve",
      message: `Takes ${items(itemCount)} back out of stock.`,
    };
  }

  // pending → confirmed → shipped → delivered and friends: the reservation
  // taken at checkout simply becomes the sale. Nothing moves.
  return { kind: "none", message: null };
}
