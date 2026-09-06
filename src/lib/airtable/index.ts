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

interface IAirtableListResponse<T> {
  records?: { id: string; fields?: T }[];
  offset?: string;
}

/** A single Airtable record, normalized to `{ id, fields }`. */
export interface IAirtableRecord<T> {
  id: string;
  fields: T;
}

/**
 * List every record in a table, following pagination.
 *
 * @param table Table name to read.
 * @param params Extra query params (e.g. `filterByFormula`, `fields[]`).
 * @throws Error with the HTTP status on non-2xx, so callers decide whether an
 * outage is fatal (the notification job aborts) or ignorable (catalog reads).
 */
export async function listAirtableRecords<T>(
  table: string,
  params: Record<string, string> = {},
): Promise<IAirtableRecord<T>[]> {
  if (!API_KEY || !BASE_ID) {
    throw new Error("Airtable is not configured.");
  }

  const records: IAirtableRecord<T>[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}`,
    );
    url.searchParams.set("pageSize", "100");
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    if (offset) url.searchParams.set("offset", offset);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Airtable list failed (${response.status}): ${response.statusText}`,
      );
    }

    const data = (await response.json()) as IAirtableListResponse<T>;
    for (const record of data.records ?? []) {
      records.push({ id: record.id, fields: (record.fields ?? {}) as T });
    }
    offset = data.offset;
  } while (offset);

  return records;
}

/**
 * Patch fields on a single record. `typecast: true` matches
 * {@link createAirtableRecord} so single-selects auto-create options.
 *
 * @throws Error on non-2xx — notably when a field does not exist in the table,
 * which is how the notification job detects a missing `Notified At` column
 * before it emails anyone.
 */
export async function updateAirtableRecord(
  id: string,
  fields: Record<string, unknown>,
  table: string = ORDERS_TABLE,
): Promise<void> {
  if (!API_KEY || !BASE_ID) {
    throw new Error("Airtable is not configured.");
  }

  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}/${id}`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields, typecast: true }),
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
    throw new Error(`Airtable update failed (${response.status}): ${detail}`);
  }
}
