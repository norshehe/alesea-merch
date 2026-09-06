import "server-only";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  listPendingSignups,
  markSignupNotified,
} from "@/lib/supabase/signup/signupClient";
import { getInventory } from "@/features/catalog/server/inventory";
import { isSendGridConfigured, sendEmail } from "@/lib/sendgrid";
import { getCatalog } from "@/features/catalog/server/catalog";
import { stockStatus, variantKey } from "@/features/catalog/lib/stock";
import { buildBackInStockEmail } from "@/features/notifications/lib/back-in-stock-email";
import type { ICatalogProduct } from "@/features/catalog/types";

/**
 * Back-in-stock notifications for "Notify Me" signups.
 *
 * State lives entirely in the `signups` row: a signup with a null `notified_at`
 * has never been emailed, and stamping it is what prevents a second send. There
 * is deliberately no "last seen stock" bookkeeping — the promise made at signup
 * is "we'll tell you when it lands", which is one email, so the stamp alone is
 * sufficient and idempotent.
 *
 * Safety properties, in order of importance:
 *  1. Nothing sends unless `BACK_IN_STOCK_SEND === "true"` (dry-run default).
 *  2. The row is stamped BEFORE the email goes out, so a crash between the two
 *     under-sends rather than double-sends. A failed send rolls the stamp back.
 *  3. The first stamp of a run acts as a preflight: if writing to Supabase
 *     fails at all, the run aborts having sent nothing.
 *
 * NO CUSTOMER EMAIL ADDRESS IS EVER LOGGED OR RETURNED. Vercel's logs are
 * readable by everyone on the project and are shipped to whatever drain is
 * attached; the mailing list is the exact data `signups` denies `anon` in the
 * database, so writing it to stdout would hand it out through the back door.
 * Signup ids identify a row precisely and are useless on their own — every
 * diagnostic below uses one.
 */

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
 * Map a signup `source` to a product slug.
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

  if (!isSupabaseAdminConfigured()) {
    result.skipped.push("Supabase is not configured — cannot read signups.");
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
    listPendingSignups().catch((error: unknown) => {
      // The signups table denies `anon` entirely, so a permission error here
      // means the service-role key is wrong or missing — the same failure the
      // "Notify Me" form would hit when writing.
      throw new Error(
        `Could not read the "signups" table. Confirm SUPABASE_SERVICE_ROLE_KEY is set and valid — the "Notify Me" form writes to the same table. Cause: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }),
  ]);

  // Group pending signups by the product they signed up for. `listPendingSignups`
  // already excludes anything with a `notified_at`.
  const pending = new Map<string, { id: string; email: string }[]>();
  for (const signup of signups) {
    if (!signup.email || !signup.source) continue;

    const slug = slugForSource(signup.source, products);
    if (!slug) {
      // The id, not the source: this string is returned in the cron response,
      // and `source` is attacker-influenced free text from a public form.
      result.skipped.push(`Signup ${signup.id} has a source matching no product.`);
      continue;
    }

    const list = pending.get(slug) ?? [];
    list.push({ id: signup.id, email: signup.email });
    pending.set(slug, list);
  }

  // Preflight guards the whole run: once one stamp has landed we know writes
  // work, so a later stamp failing is a per-recipient problem, not a systemic one.
  let preflightDone = false;

  for (const [slug, recipients] of pending) {
    const product = products.find((p) => p.slug === slug);
    if (!product) continue;
    if (!isInStock(product, inventory)) continue;

    result.products.push({ slug, recipients: recipients.length });

    if (!live) {
      // Dry run: report HOW MANY would be emailed and which rows, touch
      // nothing. Dry run is the production default, so this line runs on every
      // scheduled invocation — it previously printed the entire mailing list to
      // the logs, daily.
      console.info(
        `[back-in-stock] dry-run — would email ${recipients.length} recipient(s) about ${slug}. Signup ids:`,
        recipients.map((r) => r.id).join(", "),
      );
      continue;
    }

    const { subject, text, html } = buildBackInStockEmail(product, siteUrl);
    const stampedAt = new Date().toISOString();

    for (const recipient of recipients) {
      try {
        // Stamp first — see the safety notes above.
        await markSignupNotified(recipient.id, stampedAt, slug);
        preflightDone = true;
      } catch (error) {
        if (!preflightDone) {
          const message =
            "Could not write `notified_at` to the signups table — aborting before any email is sent. Check SUPABASE_SERVICE_ROLE_KEY and Supabase connectivity.";
          console.error(`[back-in-stock] ${message}`, error);
          result.skipped.push(message);
          return result;
        }
        console.error(
          `[back-in-stock] could not stamp signup ${recipient.id} — skipping to avoid a duplicate send.`,
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
          `[back-in-stock] send failed for signup ${recipient.id} — rolling back the stamp.`,
          error,
        );
        result.failed += 1;
        try {
          // NULL, not "" — an empty string would still count as notified.
          await markSignupNotified(recipient.id, null, null);
        } catch (rollbackError) {
          console.error(
            `[back-in-stock] rollback failed for signup ${recipient.id} — it will not be retried automatically.`,
            rollbackError,
          );
        }
      }
    }
  }

  return result;
}
