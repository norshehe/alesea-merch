"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ORDER_STATUS_LABELS,
  stockConsequence,
} from "@/features/admin/orders/lib/order-status";
import { updateOrderStatus } from "@/features/admin/orders/server/order.actions";
import {
  ORDER_STATUSES,
  type OrderStatus,
} from "@/features/admin/orders/schemas/order.schema";

interface IOrderStatusControlProps {
  orderId: string;
  status: OrderStatus;
  /** Total units on the order — what the consequence line counts. */
  itemCount: number;
  /** Whether this order is currently holding stock. Owned by the DB. */
  stockReserved: boolean;
}

/**
 * Change an order's status, with the stock consequence spelled out first.
 *
 * A status change can move inventory (the `sync_order_stock` trigger), and the
 * admin must never discover that after the fact. Any transition that WILL move
 * stock — cancelling, refunding, or reinstating a cancelled order — goes
 * through a confirmation that names the consequence. Transitions that only
 * advance fulfilment apply immediately and say nothing about stock, because
 * nothing happens to it.
 *
 * No optimistic update: the trigger decides what actually happened, so the row
 * is re-read via `router.refresh()` rather than guessed at here.
 *
 * The Select is controlled by the SERVER value, not local state — Base UI
 * Select is not a native input, and letting it drift from the row would show a
 * status the database never accepted.
 */
export function OrderStatusControl({
  orderId,
  status,
  itemCount,
  stockReserved,
}: IOrderStatusControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  /** The status awaiting confirmation, or null when no dialog is open. */
  const [confirming, setConfirming] = useState<OrderStatus | null>(null);

  function apply(next: OrderStatus) {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setConfirming(null);
      const label = ORDER_STATUS_LABELS[result.status];
      // Report what the trigger DID, not what was predicted before the write.
      if (result.stockMoved === "released") {
        toast.success(`Marked ${label}. Stock returned to inventory.`);
      } else if (result.stockMoved === "reserved") {
        toast.success(`Marked ${label}. Stock taken back out of inventory.`);
      } else {
        toast.success(`Marked ${label}.`);
      }
      router.refresh();
    });
  }

  // Base UI infers the value type from `value` and allows null (cleared).
  // Clearing is not a state an order can be in, so it is ignored.
  function onSelect(next: OrderStatus | null) {
    if (next === null || next === status) return;

    const consequence = stockConsequence(status, next, itemCount, stockReserved);
    if (consequence.kind === "none") {
      apply(next);
      return;
    }
    setConfirming(next);
  }

  const consequence =
    confirming === null
      ? null
      : stockConsequence(status, confirming, itemCount, stockReserved);

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="order-status" className="text-muted-foreground text-sm">
        Status
      </Label>
      <Select
        value={status}
        onValueChange={onSelect}
        disabled={isPending}
      >
        <SelectTrigger id="order-status" className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ORDER_STATUSES.map((option) => (
            <SelectItem key={option} value={option}>
              {ORDER_STATUS_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) setConfirming(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirming === null
                ? "Change status"
                : `Mark this order ${ORDER_STATUS_LABELS[confirming].toLowerCase()}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {consequence?.message}{" "}
              {consequence?.kind === "release"
                ? "Variants that are not tracked in inventory are left alone."
                : "Variants that are not tracked in inventory are left alone, and the order may no longer have enough stock behind it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={consequence?.kind === "release" ? "destructive" : "default"}
              disabled={isPending}
              onClick={() => {
                if (confirming !== null) apply(confirming);
              }}
            >
              {isPending
                ? "Saving…"
                : confirming === null
                  ? "Confirm"
                  : `Mark ${ORDER_STATUS_LABELS[confirming].toLowerCase()}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
