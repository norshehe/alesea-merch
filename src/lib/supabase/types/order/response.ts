import type { Database } from "@/lib/supabase/types";

/**
 * The `order_status` enum — the single TypeScript name for it. The admin
 * schema's `ORDER_STATUSES` tuple and the order emails both use this type.
 */
export type OrderStatus = Database["public"]["Enums"]["order_status"];
