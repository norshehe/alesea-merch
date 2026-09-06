import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ORDER_STATUSES,
  type OrderStatus,
} from "@/features/admin/orders/schemas/order.schema";

/**
 * Admin reads for `orders` and `order_items`. Everything goes through the
 * COOKIE-BOUND client so RLS evaluates as the signed-in admin — orders are
 * customer PII with no anon policy at all, and the service-role client would
 * bypass exactly the check that keeps them private.
 *
 * Line items are read as SNAPSHOTS. Nothing here joins `products` for a name or
 * a price: an order shows what the customer actually paid, forever, even after
 * the product is repriced, renamed or deleted.
 */

/** One page of the orders table. Small enough to scan, large enough to be rare. */
export const ORDERS_PAGE_SIZE = 25;

export interface IAdminOrderListItem {
  id: string;
  reference: string;
  status: OrderStatus;
  customerName: string;
  email: string;
  itemCount: number;
  total: number;
  currency: string;
  createdAt: string;
}

export interface IAdminOrderItem {
  id: string;
  slug: string;
  /** Snapshot at checkout — never re-read from `products`. */
  name: string;
  color: string;
  size: string;
  /** "Beige · M", exactly as it was displayed at checkout. */
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface IAdminOrder {
  id: string;
  reference: string;
  status: OrderStatus;
  customerName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  deliveryMethod: string;
  deliveryLabel: string;
  paymentMethod: string;
  itemCount: number;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  promoCode: string | null;
  /** True while this order is holding stock. Owned by the DB trigger. */
  stockReserved: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
  items: IAdminOrderItem[];
}

export interface IAdminOrderPage {
  orders: IAdminOrderListItem[];
  /** Total matching the current filters, not the total in the table. */
  total: number;
  page: number;
  pageCount: number;
}

export interface IOrderStatusCounts {
  total: number;
  byStatus: Record<OrderStatus, number>;
}

interface IListAdminOrdersInput {
  status?: OrderStatus;
  q?: string;
  page?: number;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Strip the characters PostgREST uses as filter syntax before interpolating a
 * search term into an `.or(...)` string. Commas and parentheses would end the
 * clause and let a typed value change which columns are matched; `%` and `*`
 * would silently widen the LIKE. Dots are kept — only the first two in a
 * `column.op.value` triple are structural, so an email is safe.
 */
function toSearchTerm(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/[,()%*\\"']/g, "")
    .trim()
    .slice(0, 80);
}

/**
 * One page of orders, newest first (`orders_recent_idx`), with an optional
 * status filter and an optional case-insensitive match on reference or email.
 */
export async function listAdminOrders({
  status,
  q,
  page = 1,
}: IListAdminOrdersInput = {}): Promise<IAdminOrderPage> {
  const supabase = await createSupabaseServerClient();

  const current = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const from = (current - 1) * ORDERS_PAGE_SIZE;

  let query = supabase
    .from("orders")
    .select(
      "id, reference, status, customer_name, email, item_count, total, currency, created_at",
      // `exact` on a table this size is free, and the pager needs a real total.
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + ORDERS_PAGE_SIZE - 1);

  if (status) query = query.eq("status", status);

  const term = toSearchTerm(q);
  if (term) {
    query = query.or(`reference.ilike.%${term}%,email.ilike.%${term}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[admin-orders] list failed", error);
    throw new Error("Could not load orders.");
  }

  const total = count ?? 0;

  return {
    orders: (data ?? []).map((row) => ({
      id: row.id,
      reference: row.reference,
      status: row.status,
      customerName: row.customer_name,
      email: row.email,
      itemCount: row.item_count,
      total: row.total,
      currency: row.currency,
      createdAt: row.created_at,
    })),
    total,
    page: current,
    pageCount: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)),
  };
}

/** One order with its line items in checkout order (`position`). */
export async function getAdminOrder(id: string): Promise<IAdminOrder | null> {
  // A malformed id is the expected "bad URL" case. Postgres would raise 22P02
  // for it, which the page would have to translate back into a 404 anyway.
  if (!UUID_PATTERN.test(id)) return null;

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "*, order_items(id, slug, name, color, size, variant_label, quantity, unit_price, line_total, position)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin-orders] get failed", error);
    throw new Error("Could not load this order.");
  }
  if (!data) return null;

  return {
    id: data.id,
    reference: data.reference,
    status: data.status,
    customerName: data.customer_name,
    email: data.email,
    phone: data.phone,
    addressLine1: data.address_line1,
    addressLine2: data.address_line2,
    city: data.city,
    province: data.province,
    postalCode: data.postal_code,
    country: data.country,
    deliveryMethod: data.delivery_method,
    deliveryLabel: data.delivery_label,
    paymentMethod: data.payment_method,
    itemCount: data.item_count,
    subtotal: data.subtotal,
    shipping: data.shipping,
    discount: data.discount,
    total: data.total,
    currency: data.currency,
    promoCode: data.promo_code,
    stockReserved: data.stock_reserved,
    notes: data.notes ?? "",
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    items: [...(data.order_items ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        color: item.color,
        size: item.size,
        variantLabel: item.variant_label,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        lineTotal: item.line_total,
      })),
  };
}

/**
 * Counts for the filter chips. One flat read tallied in memory rather than
 * seven `head: true` counts: this table is small and seven round trips to
 * render a row of chips is the worse trade.
 */
export async function countOrdersByStatus(): Promise<IOrderStatusCounts> {
  const supabase = await createSupabaseServerClient();

  const byStatus = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, 0]),
  ) as Record<OrderStatus, number>;

  const { data, error } = await supabase.from("orders").select("status");

  if (error) {
    // Chips are navigation, not data. A failure here must not take down the
    // table they sit above — they just render as zeroes.
    console.error("[admin-orders] status counts failed", error);
    return { total: 0, byStatus };
  }

  for (const row of data ?? []) byStatus[row.status] += 1;

  return { total: (data ?? []).length, byStatus };
}
