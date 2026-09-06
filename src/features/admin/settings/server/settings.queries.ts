import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicUrl } from "@/lib/supabase/storage";
import type { IUploadedImage } from "@/features/admin/components/image-upload-field";
import type { INavLink } from "@/lib/supabase/siteSettings/siteSettingsClient";

/**
 * Admin read for the `site_settings` singleton, through the COOKIE-BOUND client
 * so RLS evaluates as the signed-in admin.
 *
 * Unlike `getSiteSettings()` on the storefront, this returns the row EXACTLY as
 * stored — no fallback merging. The form has to show what is really saved;
 * merging here would make an empty field look configured, and saving it back
 * would freeze today's default into the database forever.
 */

/** The `site_settings` row in the shape the form's controls hold. */
export interface IAdminSiteSettings {
  title: string;
  /** Zero or one uploaded logo. `logo_path` wins over `logo_url` on render. */
  logoImage: IUploadedImage[];
  logoUrl: string;
  logoAlt: string;
  logoWidth: number;
  logoHeight: number;
  currency: string;
  freeShipThreshold: number;
  standardShipping: number;
  expressShipping: number;
  location: string;
  footerBlurb: string;
  contactEmail: string;
  contactAddress: string;
  contactSocial: string;
  navLinks: INavLink[];
  bookNowLabel: string;
  bookNowUrl: string;
  socialLinks: INavLink[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * `nav_links` / `social_links` are `jsonb`: the DB constrains the shape but the
 * generated type is `Json`, so it stays untrusted at the boundary. Same guard
 * as the storefront client.
 */
function toLinks(raw: unknown): INavLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (link: unknown): link is { label: string; href: string } =>
        isRecord(link) &&
        typeof link.label === "string" &&
        typeof link.href === "string",
    )
    .map((link) => ({ label: link.label, href: link.href }));
}

/**
 * The settings row, or null when it is missing.
 *
 * Null should be impossible — `0003_content.sql` seeds `id = 1` and the CHECK
 * makes a second row unrepresentable — so the page treats it as "this database
 * has not been migrated" rather than as an empty form.
 */
export async function getAdminSiteSettings(): Promise<IAdminSiteSettings | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("[admin-settings] read failed", error);
    throw new Error("Could not load site settings.");
  }
  if (!data) return null;

  const logoUploadUrl = publicUrl(data.logo_path);

  return {
    title: data.title ?? "",
    logoImage:
      data.logo_path && logoUploadUrl
        ? [
            {
              url: logoUploadUrl,
              path: data.logo_path,
              alt: data.logo_alt ?? "",
              width: data.logo_width ?? 0,
              height: data.logo_height ?? 0,
            },
          ]
        : [],
    logoUrl: data.logo_url ?? "",
    logoAlt: data.logo_alt ?? "",
    logoWidth: data.logo_width ?? 0,
    logoHeight: data.logo_height ?? 0,
    currency: data.currency ?? "",
    freeShipThreshold: data.free_ship_threshold ?? 0,
    standardShipping: data.standard_shipping ?? 0,
    expressShipping: data.express_shipping ?? 0,
    location: data.location ?? "",
    footerBlurb: data.footer_blurb ?? "",
    contactEmail: data.contact_email ?? "",
    contactAddress: data.contact_address ?? "",
    contactSocial: data.contact_social ?? "",
    navLinks: toLinks(data.nav_links),
    bookNowLabel: data.book_now_label ?? "",
    bookNowUrl: data.book_now_url ?? "",
    socialLinks: toLinks(data.social_links),
  };
}
