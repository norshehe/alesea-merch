import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicUrl } from "@/lib/supabase/storage";
import type { IUploadedImage } from "@/features/admin/components/image-upload-field";
import type {
  ProductCategory,
  ProductStatus,
} from "@/features/admin/products/schemas/product.schema";
import type { IProductColor } from "@/features/catalog/types";

/**
 * Admin reads for `products`. Everything goes through the COOKIE-BOUND client
 * so RLS evaluates as the signed-in admin — the service-role client would
 * bypass exactly the checks that make this surface safe.
 *
 * Unlike the storefront's `productClient`, these include drafts.
 */

/** Per-product stock roll-up shown in the list. */
export interface IProductStockSummary {
  /** Variants with an explicit `inventory` row. Absent rows are "unknown". */
  tracked: number;
  outOfStock: number;
  units: number;
}

/**
 * How many `inventory` rows the list roll-up will read before it gives up.
 *
 * PostgREST caps an unbounded select at 1000 rows and returns the truncation
 * SILENTLY, which would show a wrong-but-plausible unit count. An explicit
 * range past that cap lets the read detect its own truncation and report the
 * roll-up as unavailable instead of lying.
 */
const INVENTORY_SCAN_LIMIT = 5000;

export interface IAdminProductListItem {
  id: string;
  slug: string;
  title: string;
  category: ProductCategory;
  price: number;
  currency: string;
  status: ProductStatus;
  comingSoon: boolean;
  sortOrder: number;
  /** First image by position, or null when the product has none. */
  image: { url: string; alt: string } | null;
  /**
   * `null` when the inventory read FAILED or truncated — not the same thing as
   * "no rows". In this app "not tracked" is a load-bearing claim meaning
   * "treated as in stock", so it must never stand in for "we do not know".
   */
  stock: IProductStockSummary | null;
}

export interface IAdminProduct {
  id: string;
  slug: string;
  title: string;
  category: ProductCategory;
  price: number;
  currency: string;
  blurb: string;
  materials: string;
  sizeLabel: string;
  sizes: string[];
  colors: IProductColor[];
  comingSoon: boolean;
  sortOrder: number;
  status: ProductStatus;
  images: IUploadedImage[];
}

/** A stock row whose colour/size the product no longer declares. */
export interface IInventoryOrphan {
  id: string;
  productId: string;
  slug: string;
  title: string;
  color: string;
  size: string;
  stock: number;
}

/** A UUID, so a hand-typed URL becomes a 404 rather than a Postgres 22P02. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * `colors` is `jsonb`: the DB constrains its shape but the generated type is
 * `Json`, so it stays untrusted at the boundary. Same guard as the storefront.
 */
function toColors(raw: unknown): IProductColor[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (c: unknown): c is { name: string; hex: string } =>
        isRecord(c) && typeof c.name === "string" && typeof c.hex === "string",
    )
    .map((c) => ({ name: c.name, hex: c.hex }));
}

/** Products for the admin table, ordered exactly as the storefront orders them. */
export async function listAdminProducts(): Promise<IAdminProductListItem[]> {
  const supabase = await createSupabaseServerClient();

  const [products, inventory] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, slug, title, category, price, currency, status, coming_soon, sort_order, product_images(storage_path, alt, position)",
      )
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
    // One flat read, grouped in memory: a handful of products means a join per
    // row would cost more than it saves.
    supabase
      .from("inventory")
      .select("product_id, stock")
      .range(0, INVENTORY_SCAN_LIMIT),
  ]);

  if (products.error) {
    console.error("[admin-products] list failed", products.error);
    throw new Error("Could not load products.");
  }
  const inventoryRows = inventory.data ?? [];
  // A truncated read would under-count units for the products at the tail, and
  // an under-count reads as real data. Both failures collapse to "unknown".
  const stockUnavailable =
    inventory.error !== null || inventoryRows.length > INVENTORY_SCAN_LIMIT;
  if (inventory.error) {
    console.error("[admin-products] inventory roll-up failed", inventory.error);
  } else if (stockUnavailable) {
    console.error(
      `[admin-products] inventory roll-up truncated at ${INVENTORY_SCAN_LIMIT} rows`,
    );
  }

  const stockByProduct = new Map<string, IProductStockSummary>();
  for (const row of inventoryRows) {
    const summary = stockByProduct.get(row.product_id) ?? {
      tracked: 0,
      outOfStock: 0,
      units: 0,
    };
    summary.tracked += 1;
    summary.units += row.stock;
    if (row.stock <= 0) summary.outOfStock += 1;
    stockByProduct.set(row.product_id, summary);
  }

  return (products.data ?? []).map((row) => {
    const first = [...(row.product_images ?? [])].sort(
      (a, b) => a.position - b.position,
    )[0];
    const url = first ? publicUrl(first.storage_path) : null;

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category,
      price: row.price,
      currency: row.currency,
      status: row.status,
      comingSoon: row.coming_soon,
      sortOrder: row.sort_order,
      image: url
        ? { url, alt: first.alt.trim() || row.title }
        : null,
      stock: stockUnavailable
        ? null
        : (stockByProduct.get(row.id) ?? {
            tracked: 0,
            outOfStock: 0,
            units: 0,
          }),
    };
  });
}

/** A single product with its ordered images, for the edit form. */
export async function getAdminProduct(id: string): Promise<IAdminProduct | null> {
  // Guard before the query, as `getAdminCategory` does: without it a hand-typed
  // `/admin/products/foo` reaches Postgres, raises 22P02 and renders a 500
  // where the honest answer is a 404.
  if (!UUID_PATTERN.test(id)) return null;

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(storage_path, alt, width, height, position)")
    .eq("id", id)
    // No row is the expected "bad URL" case, which the page turns into a 404.
    .maybeSingle();

  if (error) {
    console.error("[admin-products] get failed", error);
    throw new Error("Could not load this product.");
  }
  if (!data) return null;

  /**
   * ⚠️ Never DROP a row here. These images round-trip: the form posts back what
   * it was given, and `writeImages` deletes every row it was not given — so
   * silently skipping an unrenderable row would delete it, and its bytes, on
   * the next save. `publicUrl` only returns null when the Storage host is
   * unconfigured, which is an environment fault, so it is surfaced as one.
   */
  const images: IUploadedImage[] = [...(data.product_images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((row) => {
      const url = publicUrl(row.storage_path);
      if (!url) {
        console.error(
          "[admin-products] no public URL for image",
          row.storage_path,
        );
        throw new Error(
          "Storage is not configured, so this product's images cannot be edited safely.",
        );
      }
      return {
        url,
        path: row.storage_path,
        alt: row.alt,
        width: row.width,
        height: row.height,
      };
    });

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    category: data.category,
    price: data.price,
    currency: data.currency,
    blurb: data.blurb,
    materials: data.materials,
    sizeLabel: data.size_label,
    sizes: data.sizes ?? [],
    colors: toColors(data.colors),
    comingSoon: data.coming_soon,
    sortOrder: data.sort_order,
    status: data.status,
    images,
  };
}

/**
 * Stock rows stranded by a colour/size rename. The `inventory_options_exist`
 * trigger cannot catch these — it fires on `inventory`, and the write that
 * breaks them lands on `products`. This is the bug class that made the
 * Weekender Tote silently unbuyable, so the admin surfaces it explicitly.
 */
export async function listInventoryOrphans(
  productId?: string,
): Promise<IInventoryOrphan[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("inventory_orphans")
    .select("id, product_id, slug, title, color, size, stock");
  if (productId) query = query.eq("product_id", productId);

  const { data, error } = await query;

  if (error) {
    // A missing warning must never take down the page it warns on.
    console.error("[admin-products] orphan lookup failed", error);
    return [];
  }

  return (data ?? [])
    .filter((row) => row.id !== null && row.product_id !== null)
    .map((row) => ({
      id: row.id ?? "",
      productId: row.product_id ?? "",
      slug: row.slug ?? "",
      title: row.title ?? "",
      color: row.color ?? "",
      size: row.size ?? "",
      stock: row.stock ?? 0,
    }));
}
