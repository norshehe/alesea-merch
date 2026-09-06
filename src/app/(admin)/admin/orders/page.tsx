import Link from "next/link";
import { ShoppingBag, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/features/admin/components/empty-state";
import { PageHeader } from "@/features/admin/components/page-header";
import { OrderSearch } from "@/features/admin/orders/components/order-search";
import { OrderStatusBadge } from "@/features/admin/orders/components/order-status-badge";
import { ORDER_STATUS_LABELS } from "@/features/admin/orders/lib/order-status";
import {
  countOrdersByStatus,
  listAdminOrders,
} from "@/features/admin/orders/server/order.queries";
import {
  ORDER_STATUSES,
  type OrderStatus,
} from "@/features/admin/orders/schemas/order.schema";
import { formatPrice } from "@/lib/format";

/**
 * Orders are READ + STATUS ONLY. There is no "new order" action and nothing on
 * this screen edits amounts or line items — an order is the customer's record
 * of what they asked for and what they were quoted.
 */

const DATE_FORMAT = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** Filter state lives entirely in the URL, so every view is linkable. */
function ordersHref(params: {
  status?: OrderStatus | null;
  q?: string;
  page?: number;
}): string {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

function FilterChip({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Button
      size="sm"
      variant={active ? "secondary" : "ghost"}
      aria-current={active ? "page" : undefined}
      render={<Link href={href} />}
    >
      {label}
      <span className="text-muted-foreground tabular-nums">{count}</span>
    </Button>
  );
}

/**
 * A disabled anchor is still clickable, so the boundary case renders a real
 * disabled <button> instead of a Link that goes nowhere.
 */
function PagerLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" render={<Link href={href} />}>
      {children}
    </Button>
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  // Next 16: `searchParams` is a Promise and MUST be awaited.
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const {
    status: rawStatus,
    q: rawQuery,
    page: rawPage,
  } = await searchParams;

  // An unknown status in the URL falls back to "all" rather than 404ing — a
  // hand-edited query string should not be a dead end.
  const status = ORDER_STATUSES.includes(rawStatus as OrderStatus)
    ? (rawStatus as OrderStatus)
    : null;
  const query = rawQuery?.trim() ?? "";
  const parsedPage = Number(rawPage);
  const page =
    Number.isFinite(parsedPage) && parsedPage >= 1 ? Math.floor(parsedPage) : 1;

  const [counts, result] = await Promise.all([
    countOrdersByStatus(),
    listAdminOrders({ status: status ?? undefined, q: query, page }),
  ]);

  const filtered = status !== null || query.length > 0;

  return (
    <>
      <PageHeader
        title="Orders"
        description="Customer orders and fulfilment status. Amounts and line items are read-only."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          <FilterChip
            href={ordersHref({ q: query })}
            label="All"
            count={counts.total}
            active={status === null}
          />
          {ORDER_STATUSES.map((option) => (
            <FilterChip
              key={option}
              href={ordersHref({ status: option, q: query })}
              label={ORDER_STATUS_LABELS[option]}
              count={counts.byStatus[option]}
              active={status === option}
            />
          ))}
        </div>
        <OrderSearch q={query} status={status} />
      </div>

      {/* Two different nothings: an empty shop, and a filter that matched
          nothing. Showing "No orders yet" to someone who just searched sends
          them looking for a bug that isn't there. */}
      {counts.total === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders yet"
          description="Orders placed on the storefront will appear here as soon as someone checks out."
        />
      ) : result.orders.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No orders match"
          description="No order matches this filter and search. Try a different status, or search by full reference or email."
          action={
            <Button variant="outline" render={<Link href="/admin/orders" />}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Placed</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="focus-visible:ring-ring/50 rounded font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3"
                      >
                        {order.reference}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {DATE_FORMAT.format(new Date(order.createdAt))}
                    </TableCell>
                    <TableCell>
                      <span className="grid">
                        <span className="font-medium">{order.customerName}</span>
                        <span className="text-muted-foreground text-xs">
                          {order.email}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {order.itemCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {/* Per-order currency — never a hardcoded symbol. */}
                      {formatPrice(order.total, order.currency)}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {result.pageCount > 1 ? (
            <nav
              className="mt-4 flex items-center justify-between gap-3"
              aria-label="Orders pagination"
            >
              <p className="text-muted-foreground text-sm">
                Page {result.page} of {result.pageCount} · {result.total}{" "}
                {filtered ? "matching " : ""}
                {result.total === 1 ? "order" : "orders"}
              </p>
              <div className="flex items-center gap-2">
                <PagerLink
                  href={ordersHref({ status, q: query, page: result.page - 1 })}
                  disabled={result.page <= 1}
                >
                  Previous
                </PagerLink>
                <PagerLink
                  href={ordersHref({ status, q: query, page: result.page + 1 })}
                  disabled={result.page >= result.pageCount}
                >
                  Next
                </PagerLink>
              </div>
            </nav>
          ) : null}
        </>
      )}
    </>
  );
}
