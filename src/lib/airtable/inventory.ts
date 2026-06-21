import "server-only";
import { variantKey } from "@/features/catalog/lib/stock";

/**
 * Server-only Airtable inventory reads.
 *
 * Inventory is display + enforcement only (no auto-decrement). It is keyed by
 * `slug|Color|Size` and read from the literal `Inventory` table in the same base
 * as Orders. This module reads `AIRTABLE_API_KEY` and must never be imported into
 * a client bundle (the `server-only` import throws at build time if it is).
 */

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE = "Inventory";

/** A single per-variant stock row, normalized from an Airtable record. */
export interface IVariantStock {
  slug: string;
  color: string;
  size: string;
  stock: number;
}

/** True when the Airtable env vars required for inventory reads are present. */
function isAirtableConfigured(): boolean {
  return Boolean(API_KEY && BASE_ID);
}

interface IAirtableInventoryFields {
  Slug?: string;
  Color?: string;
  Size?: string;
  Stock?: number;
}

interface IAirtableListResponse {
  records?: { fields?: IAirtableInventoryFields }[];
  offset?: string;
}

/**
 * Fetch all inventory rows and return a Map keyed by `slug|color|size` → stock.
 *
 * Graceful fallback: when Airtable is not configured OR the fetch throws, this
 * warns and returns an EMPTY map. Callers MUST treat a missing key as in stock —
 * only an explicit `0` means out of stock. This guarantees the store never blocks
 * sales when Airtable is down or a variant row is simply absent.
 */
export async function getInventory(): Promise<Map<string, number>> {
  const inventory = new Map<string, number>();

  if (!isAirtableConfigured()) {
    console.warn(
      "[inventory] unavailable — treating all variants as in stock",
    );
    return inventory;
  }

  try {
    let offset: string | undefined;
    do {
      const url = new URL(
        `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}`,
      );
      url.searchParams.set("pageSize", "100");
      if (offset) url.searchParams.set("offset", offset);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${API_KEY}` },
      });

      if (!response.ok) {
        throw new Error(
          `Airtable inventory request failed (${response.status}): ${response.statusText}`,
        );
      }

      const data = (await response.json()) as IAirtableListResponse;
      for (const record of data.records ?? []) {
        const { Slug, Color, Size, Stock } = record.fields ?? {};
        if (!Slug || !Color || !Size || typeof Stock !== "number") continue;
        inventory.set(variantKey(Slug, Color, Size), Stock);
      }
      offset = data.offset;
    } while (offset);
  } catch (error) {
    console.warn(
      "[inventory] unavailable — treating all variants as in stock",
      error,
    );
    return new Map<string, number>();
  }

  return inventory;
}
