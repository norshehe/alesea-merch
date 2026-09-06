"use server";

import { requireAdmin } from "@/features/admin/server/auth";
import {
  firstIssue,
  notWrittenMessage,
  toActionMessage,
  type ActionResult,
  type ConstraintMessages,
} from "@/features/admin/server/action-result";
import { revalidateStorefrontProducts } from "@/features/admin/server/revalidate";
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

/**
 * Constraint and trigger text this table can raise.
 *
 * `inventory_options_exist_trg` raises P0001 with wording already written for
 * operators; `toActionMessage` passes P0001 through untouched, so only the
 * extra framing lives here.
 */
const INVENTORY_CONSTRAINTS: ConstraintMessages = {
  "is not an option on this product":
    "That colour or size is not an option on this product. Add it to the product's options first, or fix the spelling.",
  "unknown product": "That product no longer exists.",
  inventory_stock_check:
    "Stock cannot be negative. Use 0 for sold out, or clear the box to stop tracking it.",
  inventory_variant_key:
    "Another save just changed the same variant. Reload and try again.",
};

function toMessage(error: unknown, fallback: string): string {
  return toActionMessage(error, fallback, INVENTORY_CONSTRAINTS);
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
    return {
      ok: false,
      error: firstIssue(parsed.error.issues, "Some cells need attention."),
    };
  }

  const supabase = await createSupabaseServerClient();

  try {
    // An existence check with a clearer message than the trigger's own
    // "unknown product", which the operator would otherwise see on a stale tab.
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
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
      // No `.select()` row check here, and deliberately so: clearing a cell
      // that has no row is the NORMAL case — the grid sends every dirty cell,
      // and a blank box that was already blank matches nothing. Only a real
      // error means the delete failed.
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

    revalidateStorefrontProducts();
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
    // Existence check first, so "already removed" reads differently from
    // "your session no longer has permission".
    const { data: row, error: readError } = await supabase
      .from("inventory")
      .select("id")
      .eq("id", inventoryId)
      .maybeSingle();
    if (readError) throw readError;
    if (!row) return { ok: false, error: "That row has already been removed." };

    // `.select()` is not decoration: PostgREST reports no error when a DELETE
    // matches nothing, and an RLS-denied delete IS a zero-row delete.
    const { data: deleted, error } = await supabase
      .from("inventory")
      .delete()
      .eq("id", inventoryId)
      .select("id");
    if (error) throw error;
    if (!deleted || deleted.length === 0) {
      return { ok: false, error: notWrittenMessage("stock row") };
    }

    // An orphan reads as nothing on the storefront, but the product page still
    // renders a stock map built from this table.
    revalidateStorefrontProducts();
    return { ok: true };
  } catch (error) {
    console.error("[admin-inventory] orphan delete failed", error);
    return { ok: false, error: toMessage(error, "Could not remove that row.") };
  }
}
