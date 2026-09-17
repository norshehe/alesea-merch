import { Badge } from "@/components/ui/badge";
import {
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABELS,
} from "@/features/admin/orders/lib/order-status";
import type { OrderStatus } from "@/features/admin/orders/schemas/order.schema";
import { cn } from "@/lib/utils";

interface IOrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

/**
 * The one place a status turns into a colour. Shared by the orders list, the
 * order detail header and the dashboard's recent-orders table so the same word
 * never renders two different ways.
 */
export function OrderStatusBadge({ status, className }: IOrderStatusBadgeProps) {
  const { variant, className: statusClassName } = ORDER_STATUS_BADGE[status];

  return (
    <Badge variant={variant} className={cn(statusClassName, className)}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
