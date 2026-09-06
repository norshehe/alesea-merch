"use server";

import { requireAdmin } from "@/features/admin/server/auth";
import { revalidateProduct } from "@/features/admin/server/revalidate";
import {
  saveInventorySchema,
  type InventoryCell,
} from "@/features/admin/inventory/schemas/inventory.schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Write path for `inventory`. Every export starts with `requireAdmin()` — RLS
 * is the real gate, but an unauthenticated caller should get a redirect, not a
 * confusing permission error from Postgres.
 *
 * The rule this file exists to enforce:
 *   number → upsert a row (0 means SOLD OUT)
 *   null   → DELETE the row (back to "not tracked", which the storefront reads
 *            as in stock and the back-in-stock job reads as do-not-email)
 *
 * Blank is not zero. Writing zeroes for untouched variants would sell out the
 * catalogue in one save, which is the failure the Supabase migration was for.
 */

type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : T))
  | { ok: false; error: string };

interface IPostgresError {
  code?: string;
  message: string;
}

function isPostgresError(error: unknown): error is IPostgresError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

/**
 * Translate a constraint violation into something an operator can act on.
 * The raw error is logged, never returned — it carries SQL and column names.
 */
function toMessage(error: unknown, fallback: string): string {
  if (!isPostgresError(error)) return fallback;

  const message = error.message;

  // `inventory_options_exist_trg` raises these as plain RAISE EXCEPTION (P0001)
  // when a colour/size is not declared on the product. Its own wording is
  // already operator-readable; only the framing is added.
  if (message.includes("is not an option on this product")) {
    return `${message.charAt(0).toUpperCase()}${message.slice(1)}. Add it to the product's options first, or fix the spelling.`;
  }
  if (message.startsWith("unknown product")) {
    return "That product no longer exists.";
  }

  if (error.code === "23514" && message.includes("stock")) {
    return "Stock cannot be negative. Use 0 for sold out, or clear the box to stop tracking it.";
  }

  if (error.code === "23505") {
    return "Another save just changed the same variant. Reload and try again.";
  }

  return fallback;
}

/** Zod issue → the sentence the operator sees. */
function firstIssue(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Some cells need attention.";
}

/**
 * Save ONLY the dirty cells of one product's grid.
 *
 * Deletes run first, then the upsert, so clearing one cell and filling another
 * in the same pass cannot fight each other.
 */
export async function saveInventory(
  productId: string,
  cells: InventoryCell[],
): Promise<ActionResult<{ updated: number; cleared: number }>> {
  await requireAdmin();

  // The client schema is a UX affordance, not a security boundary — re-parse.
  const parsed = saveInventorySchema.safeParse({ productId, cells });
  if (!parsed.success) {
    return { ok: false, error: firstIssue(parsed.error.issues) };
  }

  const supabase = await createSupabaseServerClient();

  try {
    // The slug is needed for revalidation and doubles as an existence check.
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("slug")
      .eq("id", parsed.data.productId)
      .maybeSingle();
    if (productError) throw productError;
    if (!product) return { ok: false, error: "That product no longer exists." };

    const cleared = parsed.data.cells.filter((cell) => cell.stock === null);
    const updated = parsed.data.cells.filter(
      (cell): cell is InventoryCell & { stock: number } => cell.stock !== null,
    );

    // One statement per cleared cell: the unique key is composite, and PostgREST
    // cannot express "any of these (color, size) pairs" in a single filter.
    // A grid save is a handful of cells, so the round trips are cheap.
    for (const cell of cleared) {
      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("product_id", parsed.data.productId)
        .eq("color", cell.color)
        .eq("size", cell.size);
      if (error) throw error;
    }

    if (updated.length > 0) {
      // `inventory_variant_key` is a real column-based unique constraint, so
      // `onConflict` works here (unlike `signups`, whose index is on an
      // expression and therefore needs an explicit read-then-write).
      const { error } = await supabase.from("inventory").upsert(
        updated.map((cell) => ({
          product_id: parsed.data.productId,
          color: cell.color,
          size: cell.size,
          stock: cell.stock,
        })),
        { onConflict: "product_id,color,size" },
      );
      if (error) throw error;
    }

    revalidateProduct(product.slug);
    return { ok: true, updated: updated.length, cleared: cleared.length };
  } catch (error) {
    console.error("[admin-inventory] save failed", error);
    return { ok: false, error: toMessage(error, "Could not save stock.") };
  }
}

/**
 * Delete one orphaned stock row — a row whose colour/size the product no longer
 * declares, stranded by a rename. The product editor only WARNS about these;
 * this is where they get resolved.
 */
export async function deleteOrphanRow(
  inventoryId: string,
): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();

  try {
    // Read the slug before the delete — afterwards there is nothing to join to.
    const { data: row, error: readError } = await supabase
      .from("inventory")
      .select("product_id, products(slug)")
      .eq("id", inventoryId)
      .maybeSingle();
    if (readError) throw readError;
    if (!row) return { ok: false, error: "That row has already been removed." };

    const { error } = await supabase
      .from("inventory")
      .delete()
      .eq("id", inventoryId);
    if (error) throw error;

    const slug = row.products?.slug;
    // An orphan reads as nothing on the storefront, but the product page still
    // renders a stock map built from this table.
    if (slug) revalidateProduct(slug);
    return { ok: true };
  } catch (error) {
    console.error("[admin-inventory] orphan delete failed", error);
    return { ok: false, error: toMessage(error, "Could not remove that row.") };
  }
}
