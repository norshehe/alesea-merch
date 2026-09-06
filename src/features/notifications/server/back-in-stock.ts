import "server-only";
import {
  isAirtableConfigured,
  listAirtableRecords,
  updateAirtableRecord,
  SIGNUPS_TABLE,
} from "@/lib/airtable";
import { getInventory } from "@/features/catalog/server/inventory";
import { isSendGridConfigured, sendEmail } from "@/lib/sendgrid";
import { getCatalog } from "@/features/catalog/server/catalog";
import { stockStatus, variantKey } from "@/features/catalog/lib/stock";
import { buildBackInStockEmail } from "@/features/notifications/lib/back-in-stock-email";
import type { ICatalogProduct } from "@/features/catalog/types";

/**
 * Back-in-stock notifications for "Notify Me" signups.
 *
 * State lives entirely in the Airtable Signups row: a signup with no
 * `Notified At` has never been emailed, and stamping it is what prevents a
 * second send. There is deliberately no "last seen stock" bookkeeping — the
 * promise made at signup is "we'll tell you when it lands", which is one email,
 * so the stamp alone is sufficient and idempotent.
 *
 * Safety properties, in order of importance:
 *  1. Nothing sends unless `BACK_IN_STOCK_SEND === "true"` (dry-run default).
 *  2. The row is stamped BEFORE the email goes out, so a crash between the two
 *     under-sends rather than double-sends. A failed send rolls the stamp back.
 *  3. The first stamp of a run acts as a preflight: if the `Notified At` column
 *     is missing, the run aborts having sent nothing.
 */

/** Signup fields we read from Airtable. */
interface ISignupFields {
  Email?: string;
  Source?: string;
  "Notified At"?: string;
  "Notified For"?: string;
}

/** Outcome of one run, returned to the cron route and logged. */
export interface IBackInStockResult {
  /** True when no email was actually sent because the job is in dry-run mode. */
  dryRun: boolean;
  /** Products found to be back in stock with pending signups. */
  products: { slug: string; recipients: number }[];
  sent: number;
  failed: number;
  skipped: string[];
}

/**
 * Map a signup `Source` to a product slug.
 *
 * Sources are form-placement labels, not slugs — the tote teaser writes
 * `weekender-tote-teaser` while the product card writes `weekender-tote`. We
 * match the longest product slug that the source starts with, so new
 * `<slug>-<placement>` sources keep working without a lookup table.
 */
export function slugForSource(
  source: string,
  products: ICatalogProduct[],
): string | undefined {
  return products
    .map((p) => p.slug)
    .filter((slug) => source === slug || source.startsWith(`${slug}-`))
    .sort((a, b) => b.length - a.length)[0];
}

/** True when any variant of the product has stock above zero. */
function isInStock(
  product: ICatalogProduct,
  inventory: Map<string, number>,
): boolean {
  const colors = product.colors.length > 0 ? product.colors : [{ name: "" }];
  const sizes = product.sizes.length > 0 ? product.sizes : [""];

  for (const color of colors) {
    for (const size of sizes) {
      const value = inventory.get(variantKey(product.slug, color.name, size));
      // Unknown stock means "in stock" everywhere else in the app, but here it
      // would email customers about a product nobody has stocked yet. This job
      // requires an explicit positive number.
      if (typeof value === "number" && stockStatus(value) !== "out") return true;
    }
  }
  return false;
}

/**
 * Find every signup owed a back-in-stock email and (unless in dry-run) send it.
 *
 * Returns a summary rather than throwing for per-recipient failures: one bad
 * address must not stop the rest of the queue.
 */
export async function runBackInStockNotifications(): Promise<IBackInStockResult> {
  const live = process.env.BACK_IN_STOCK_SEND === "true";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://alesea.co";
  const result: IBackInStockResult = {
    dryRun: !live,
    products: [],
    sent: 0,
    failed: 0,
    skipped: [],
  };

  if (!isAirtableConfigured()) {
    result.skipped.push("Airtable is not configured — cannot read signups.");
    return result;
  }
  if (live && !isSendGridConfigured()) {
    result.skipped.push(
      "SendGrid is not configured — refusing to run live. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL.",
    );
    return result;
  }

  const [products, inventory, signups] = await Promise.all([
    getCatalog(),
    getInventory(),
    listAirtableRecords<ISignupFields>(SIGNUPS_TABLE).catch((error: unknown) => {
      // A 403 here is almost always "the table does not exist" rather than a
      // token problem — Airtable returns INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND
      // for both. Say so, because the signup form fails for the same reason.
      throw new Error(
        `Could not read the Airtable "${SIGNUPS_TABLE}" table. Confirm it exists and the token can read it — the "Notify Me" form writes to the same table. Cause: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }),
  ]);

  // Group un-notified signups by the product they signed up for.
  const pending = new Map<string, { id: string; email: string }[]>();
  for (const signup of signups) {
    const { Email, Source, "Notified At": notifiedAt } = signup.fields;
    if (!Email || !Source || notifiedAt) continue;

    const slug = slugForSource(Source, products);
    if (!slug) {
      result.skipped.push(`Signup source "${Source}" matches no product.`);
      continue;
    }

    const list = pending.get(slug) ?? [];
    list.push({ id: signup.id, email: Email });
    pending.set(slug, list);
  }

  // Preflight guards the whole run: once it has passed we know the column
  // exists, so later stamps failing is a per-recipient problem, not a schema one.
  let preflightDone = false;

  for (const [slug, recipients] of pending) {
    const product = products.find((p) => p.slug === slug);
    if (!product) continue;
    if (!isInStock(product, inventory)) continue;

    result.products.push({ slug, recipients: recipients.length });

    if (!live) {
      // Dry run: report who would be emailed, touch nothing.
      console.info(
        `[back-in-stock] dry-run — would email ${recipients.length} recipient(s) about ${slug}:`,
        recipients.map((r) => r.email).join(", "),
      );
      continue;
    }

    const { subject, text, html } = buildBackInStockEmail(product, siteUrl);
    const stampedAt = new Date().toISOString();

    for (const recipient of recipients) {
      try {
        // Stamp first — see the safety notes above.
        await updateAirtableRecord(
          recipient.id,
          { "Notified At": stampedAt, "Notified For": slug },
          SIGNUPS_TABLE,
        );
        preflightDone = true;
      } catch (error) {
        if (!preflightDone) {
          const message =
            "Could not write `Notified At` to the Signups table — aborting before any email is sent. Add the `Notified At` and `Notified For` fields to Airtable.";
          console.error(`[back-in-stock] ${message}`, error);
          result.skipped.push(message);
          return result;
        }
        console.error(
          `[back-in-stock] could not stamp ${recipient.email} — skipping to avoid a duplicate send.`,
          error,
        );
        result.failed += 1;
        continue;
      }

      try {
        await sendEmail({ to: recipient.email, subject, text, html });
        result.sent += 1;
      } catch (error) {
        console.error(
          `[back-in-stock] send failed for ${recipient.email} — rolling back the stamp.`,
          error,
        );
        result.failed += 1;
        try {
          await updateAirtableRecord(
            recipient.id,
            { "Notified At": "", "Notified For": "" },
            SIGNUPS_TABLE,
          );
        } catch (rollbackError) {
          console.error(
            `[back-in-stock] rollback failed for ${recipient.email} — it will not be retried automatically.`,
            rollbackError,
          );
        }
      }
    }
  }

  return result;
}
