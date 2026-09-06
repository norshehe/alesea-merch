"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/admin/server/auth";
import {
  firstIssue,
  toActionMessage,
  type ActionResult,
  type ConstraintMessages,
} from "@/features/admin/server/action-result";
import {
  settingsSchema,
  type SettingsFormValues,
  type SettingsValues,
} from "@/features/admin/settings/schemas/settings.schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Write path for the `site_settings` singleton.
 *
 * `requireAdmin()` first, as everywhere: RLS is the real gate, but an
 * unauthenticated caller should get a redirect rather than a confusing
 * permission error from Postgres. The input is re-parsed server-side — the
 * client schema is a UX affordance, not a security boundary.
 *
 * `revalidatePath` is called here rather than through
 * `features/admin/server/revalidate.ts` to keep this feature self-contained.
 */

const SETTINGS_CONSTRAINTS: ConstraintMessages = {
  site_settings_nav_shape: "Every navigation link needs both a label and a URL.",
  site_settings_social_shape:
    "Every social link needs both a label and a URL.",
};

function toMessage(error: unknown, fallback: string): string {
  return toActionMessage(error, fallback, SETTINGS_CONSTRAINTS);
}

function toRow(values: SettingsValues) {
  const logo = values.logoImage[0] ?? null;

  return {
    title: values.title,
    // `_path` wins over `_url` in `resolveImageUrl`, so an upload replaces the
    // external URL on render while the URL stays put as a fallback.
    logo_path: logo?.path ?? null,
    logo_url: values.logoUrl.length > 0 ? values.logoUrl : null,
    // One alt for both sources: the column is single, and the header renders
    // whichever source resolved.
    logo_alt: values.logoAlt,
    logo_width: values.logoWidth,
    logo_height: values.logoHeight,
    currency: values.currency,
    free_ship_threshold: values.freeShipThreshold,
    standard_shipping: values.standardShipping,
    express_shipping: values.expressShipping,
    location: values.location,
    footer_blurb: values.footerBlurb,
    contact_email: values.contactEmail,
    contact_address: values.contactAddress,
    contact_social: values.contactSocial,
    nav_links: values.navLinks,
    book_now_label: values.bookNowLabel,
    book_now_url: values.bookNowUrl,
    social_links: values.socialLinks,
  };
}

/**
 * Save the one settings row.
 *
 * `update ... eq("id", 1)`: `0003_content.sql` seeds the row and its
 * `check (id = 1)` makes a second one impossible, so there is no upsert dance.
 * The insert below only covers a database where the seed never ran.
 */
export async function saveSiteSettings(
  values: SettingsFormValues,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: firstIssue(parsed.error.issues) };
  }

  const supabase = await createSupabaseServerClient();
  const row = toRow(parsed.data);

  try {
    const { data, error } = await supabase
      .from("site_settings")
      .update(row)
      .eq("id", 1)
      .select("id")
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      // Zero rows. Usually means no seeded row (an unmigrated or manually
      // emptied database) — but it is ALSO what an RLS-denied update looks
      // like, since PostgREST reports no error for one. The insert below
      // separates the two: RLS refuses it loudly, a missing row accepts it.
      const { error: insertError } = await supabase
        .from("site_settings")
        .insert({ id: 1, ...row });
      if (insertError) throw insertError;
    }

    // ⚠️ `"layout"`, not the default page revalidation. Settings feed the
    // header, footer, currency and shipping copy, all of which are rendered by
    // the storefront ROOT LAYOUT — a page-level revalidate leaves every one of
    // them serving the old values.
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error("[admin-settings] save failed", error);
    return { ok: false, error: toMessage(error, "Could not save settings.") };
  }
}
