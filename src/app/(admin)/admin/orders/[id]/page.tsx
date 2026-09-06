import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PackageCheck, PackageOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/features/admin/components/page-header";
import { OrderNotesForm } from "@/features/admin/orders/components/order-notes-form";
import { OrderStatusBadge } from "@/features/admin/orders/components/order-status-badge";
import { OrderStatusControl } from "@/features/admin/orders/components/order-status-control";
import { getAdminOrder } from "@/features/admin/orders/server/order.queries";
import { formatPrice } from "@/lib/format";

/**
 * One order, read-only apart from its status and the shop's own notes.
 *
 * Everything shown here is the SNAPSHOT taken at checkout — names and unit
 * prices come from `order_items`, never from a join to `products`. A reprice or
 * a rename must not rewrite history.
 */

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
});

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm break-words">{value || "—"}</dd>
    </div>
  );
}

function TotalRow({
  label,
  amount,
  currency,
  emphasis = false,
}: {
  label: string;
  amount: number;
  currency: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-6 text-sm">
      <span className={emphasis ? "font-medium" : "text-muted-foreground"}>
        {label}
      </span>
      {/* Per-order currency — never a hardcoded symbol. */}
      <span className={emphasis ? "font-semibold tabular-nums" : "tabular-nums"}>
        {formatPrice(amount, currency)}
      </span>
    </div>
  );
}

export default async function AdminOrderDetailPage({
  params,
}: {
  // Next 16: `params` is a Promise and MUST be awaited.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getAdminOrder(id);

  if (!order) notFound();

  const addressLines = [
    order.addressLine1,
    order.addressLine2,
    [order.city, order.province].filter(Boolean).join(", "),
    order.postalCode,
    order.country,
  ].filter((line) => line.trim().length > 0);

  return (
    <>
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/admin/orders" />}
        >
          <ArrowLeft aria-hidden="true" />
          All orders
        </Button>
      </div>

      <PageHeader
        title={order.reference}
        description={`Placed ${DATE_TIME_FORMAT.format(new Date(order.createdAt))}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <OrderStatusBadge status={order.status} />
            <OrderStatusControl
              orderId={order.id}
              status={order.status}
              itemCount={order.itemCount}
              stockReserved={order.stockReserved}
            />
          </div>
        }
      />

      {/* The trigger owns this flag; the admin only reads it. It explains why a
          cancelled order's variants are back on sale. */}
      <div className="mb-6">
        <Badge
          variant={order.stockReserved ? "secondary" : "outline"}
          className="gap-1.5"
        >
          {order.stockReserved ? (
            <PackageCheck aria-hidden="true" />
          ) : (
            <PackageOpen aria-hidden="true" />
          )}
          {order.stockReserved
            ? "Stock reserved for this order"
            : "Stock released back to inventory"}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3">
              <DetailRow label="Name" value={order.customerName} />
              <DetailRow label="Email" value={order.email} />
              <DetailRow label="Phone" value={order.phone} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Shipping address</CardTitle>
          </CardHeader>
          <CardContent>
            <address className="text-sm not-italic">
              {addressLines.length === 0
                ? "—"
                : addressLines.map((line) => <div key={line}>{line}</div>)}
            </address>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Delivery &amp; payment</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3">
              {/* The label is what the customer saw; the method is the key we
                  store. Both are shown so a renamed option stays traceable. */}
              <DetailRow label="Delivery" value={order.deliveryLabel} />
              <DetailRow label="Delivery method" value={order.deliveryMethod} />
              <DetailRow label="Payment" value={order.paymentMethod} />
              {order.promoCode ? (
                <DetailRow label="Promo code" value={order.promoCode} />
              ) : null}
            </dl>
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">
          Items ({order.itemCount})
        </h2>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.variantLabel || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(item.unitPrice, order.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(item.lineTotal, order.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex justify-end">
          <div className="bg-card grid w-full max-w-xs gap-2 rounded-lg border p-4">
            <TotalRow
              label="Subtotal"
              amount={order.subtotal}
              currency={order.currency}
            />
            <TotalRow
              label="Shipping"
              amount={order.shipping}
              currency={order.currency}
            />
            {order.discount > 0 ? (
              <TotalRow
                label="Discount"
                amount={-order.discount}
                currency={order.currency}
              />
            ) : null}
            <Separator />
            <TotalRow
              label="Total"
              amount={order.total}
              currency={order.currency}
              emphasis
            />
          </div>
        </div>
      </section>

      <section className="mt-8 max-w-xl">
        <h2 className="mb-3 text-sm font-semibold">Notes</h2>
        <OrderNotesForm orderId={order.id} notes={order.notes} />
      </section>
    </>
  );
}
