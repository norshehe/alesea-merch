import { getSupabasePublic } from "@/lib/supabase/public";
import { toImage } from "@/lib/supabase/types/common";
import type { IImage } from "@/lib/supabase/types/common";

/** A resolved navigation link. */
export interface INavLink {
  label: string;
  href: string;
}

/** Normalized site settings consumed by the layout, header and footer. */
export interface ISiteSettings {
  logo: IImage | null;
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

/** `nav_links` / `social_links` are `jsonb` — untrusted at the type level. */
function toNavLinks(raw: unknown): INavLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (l: unknown): l is { label: string; href: string } =>
        isRecord(l) && typeof l.label === "string" && typeof l.href === "string",
    )
    .map((l) => ({ label: l.label, href: l.href }));
}

/**
 * Fetch the singleton `site_settings` row, normalized. Returns null when the
 * row is missing so callers can apply per-field fallbacks.
 */
export async function getSiteSettingsFromSupabase(): Promise<ISiteSettings | null> {
  const { data, error } = await getSupabasePublic()
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    logo: toImage(
      data.logo_path,
      data.logo_url,
      data.logo_alt,
      data.logo_width,
      data.logo_height,
    ),
    currency: data.currency ?? "PHP",
    freeShipThreshold:
      typeof data.free_ship_threshold === "number"
        ? data.free_ship_threshold
        : 0,
    standardShipping:
      typeof data.standard_shipping === "number" ? data.standard_shipping : 0,
    expressShipping:
      typeof data.express_shipping === "number" ? data.express_shipping : 0,
    location: data.location ?? "",
    footerBlurb: data.footer_blurb ?? "",
    contactEmail: data.contact_email ?? "",
    contactAddress: data.contact_address ?? "",
    contactSocial: data.contact_social ?? "",
    navLinks: toNavLinks(data.nav_links),
    bookNowLabel: data.book_now_label ?? "",
    bookNowUrl: data.book_now_url ?? "",
    socialLinks: toNavLinks(data.social_links),
  };
}
