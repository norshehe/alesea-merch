import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Boxes, Mail, Package, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/features/admin/components/page-header";
import { OrderStatusBadge } from "@/features/admin/orders/components/order-status-badge";
import { EmptyState } from "@/features/admin/components/empty-state";
import { getDashboardData } from "@/features/admin/server/dashboard.queries";
import { formatPrice } from "@/lib/format";

function StatCard({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link href={href} className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <Card className="h-full transition-shadow hover:ring-primary/40">
        <CardHeader className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-sm">{label}</span>
          <Icon className="text-muted-foreground size-4" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          {/* `—` rather than 0 when the query failed: a wrong zero reads as
              real data and would send someone looking for a bug that isn't. */}
          <p className="text-2xl font-semibold tabular-nums">
            {value === null ? "\u2014" : value}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Store activity at a glance."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Published products"
          value={data.publishedProducts}
          href="/admin/products"
          icon={Package}
        />
        <StatCard
          label="Low / out of stock"
          value={data.lowStockVariants}
          href="/admin/inventory"
          icon={Boxes}
        />
        <StatCard
          label="Orders"
          value={data.orders}
          href="/admin/orders"
          icon={ShoppingBag}
        />
        <StatCard
          label="Signups to notify"
          value={data.pendingSignups}
          href="/admin/signups"
          icon={Mail}
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Recent orders</h2>
        {data.recentOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No orders yet"
            description="Orders placed on the storefront will appear here."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Placed</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="focus-visible:ring-ring/50 rounded font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3"
                      >
                        {order.reference}
                      </Link>
                    </TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {DATE_FORMAT.format(new Date(order.createdAt))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {/* Per-order currency — never a hardcoded symbol. */}
                      {formatPrice(order.total, order.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </>
  );
}
