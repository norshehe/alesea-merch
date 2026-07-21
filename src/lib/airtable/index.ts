import "server-only";

/**
 * Minimal Airtable REST client for sales-order tracking.
 *
 * Server-only: this module reads `AIRTABLE_API_KEY` and must never be imported
 * into a client bundle (the `server-only` import throws at build time if it is).
 */

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

/** Airtable table names, resolved from env with sensible defaults. */
export const ORDERS_TABLE = process.env.AIRTABLE_ORDERS_TABLE ?? "Orders";
export const SIGNUPS_TABLE = process.env.AIRTABLE_SIGNUPS_TABLE ?? "Signups";

/** True when every required Airtable env var is present. */
export function isAirtableConfigured(): boolean {
  return Boolean(API_KEY && BASE_ID);
}

interface IAirtableErrorBody {
  error?: { type?: string; message?: string } | string;
}

/**
 * Create a single record in an Airtable table (defaults to the Orders table).
 * `typecast: true` lets single-select fields (e.g. Status) auto-create options.
 *
 * @param fields Record field map to write.
 * @param table Table name to write to. Defaults to {@link ORDERS_TABLE}.
 * @throws Error with the HTTP status and Airtable error message on non-2xx.
 */
export async function createAirtableRecord(
  fields: Record<string, unknown>,
  table: string = ORDERS_TABLE,
): Promise<{ id: string }> {
  if (!API_KEY || !BASE_ID) {
    throw new Error("Airtable is not configured.");
  }

  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as IAirtableErrorBody;
      if (typeof body.error === "string") {
        detail = body.error;
      } else if (body.error?.message) {
        detail = body.error.message;
      }
    } catch {
      // Response body was not JSON — fall back to statusText.
    }
    throw new Error(`Airtable request failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as { records?: { id: string }[] };
  const id = data.records?.[0]?.id;
  if (!id) {
    throw new Error("Airtable response did not include a record id.");
  }

  return { id };
}
