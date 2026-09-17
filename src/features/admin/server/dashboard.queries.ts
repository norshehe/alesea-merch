import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/features/admin/orders/schemas/order.schema";
import { stockStatus } from "@/features/catalog/lib/stock";

/**
 * Reads for the admin dashboard.
 *
 * A `*.queries.ts` module like every other admin surface — these were inline in
 * `admin/page.tsx`, which is the one page that reached for the Supabase client
 * directly and the one place the RLS-and-cookie-client rule had to be restated.
 *
 * Everything goes through the COOKIE-BOUND client so RLS evaluates as the
 * signed-in admin; the service-role client would bypass exactly the checks that
 * make this surface safe.
 *
 * A count that fails comes back as `null` and renders as "—" rather than
 * throwing: one broken query should not take down the whole dashboard.
 */

/**
 * How many `inventory` rows the low-stock tile will read before giving up.
 *
 * PostgREST caps an unbounded select at 1000 rows and truncates SILENTLY. A
 * truncated tally would under-report low stock, which is exactly the number
 * someone acts on, so the read detects its own truncation and reports "—".
 */
const INVENTORY_SCAN_LIMIT = 5000;

export interface IRecentOrder {
  id: string;
  reference: string;
  customerName: string;
  total: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
}

export interface IDashboardData {
  publishedProducts: number | null;
  lowStockVariants: number | null;
  orders: number | null;
  pendingSignups: number | null;
  recentOrders: IRecentOrder[];
}

export async function getDashboardData(): Promise<IDashboardData> {
  const supabase = await createSupabaseServerClient();

  const [products, inventory, orders, signups, recent] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    // No aggregate for "rows at or below a threshold" through PostgREST, so the
    // rows come back and are counted here — bounded, and checked for truncation.
    supabase.from("inventory").select("stock").range(0, INVENTORY_SCAN_LIMIT),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase
      .from("signups")
      .select("id", { count: "exact", head: true })
      .is("notified_at", null),
    supabase
      .from("orders")
      .select("id, reference, customer_name, total, currency, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  for (const result of [products, inventory, orders, signups, recent]) {
    if (result.error) console.error("[admin-dashboard]", result.error);
  }

  const inventoryRows = inventory.data ?? [];
  const inventoryTruncated = inventoryRows.length > INVENTORY_SCAN_LIMIT;
  if (inventoryTruncated) {
    console.error(
      `[admin-dashboard] inventory read truncated at ${INVENTORY_SCAN_LIMIT} rows`,
    );
  }

  // `stockStatus` owns the thresholds (LOW_STOCK_THRESHOLD, 0 = out). Counting
  // "at or below 5" by hand here would silently drift the day that changes.
  const lowStockVariants =
    inventory.error || inventoryTruncated
      ? null
      : inventoryRows.filter((row) => stockStatus(row.stock) !== "in").length;

  return {
    publishedProducts: products.error ? null : (products.count ?? 0),
    lowStockVariants,
    orders: orders.error ? null : (orders.count ?? 0),
    pendingSignups: signups.error ? null : (signups.count ?? 0),
    recentOrders: (recent.data ?? []).map((row) => ({
      id: row.id,
      reference: row.reference,
      customerName: row.customer_name,
      total: row.total,
      currency: row.currency,
      status: row.status,
      createdAt: row.created_at,
    })),
  };
}
