import { z } from "zod";

/**
 * Mirrors `site_settings` in `supabase/migrations/0003_content.sql`.
 *
 * Almost nothing here is required, and that is deliberate: the storefront
 * merges every field against `SETTINGS_FALLBACK` (see
 * `src/features/catalog/server/settings.ts`), so a BLANK value means "use the
 * built-in default" rather than "blank the site". The rules below are only the
 * ones Postgres itself enforces — `is_link_array()` on the two jsonb columns,
 * and non-negative integers — so a value the database would reject fails HERE,
 * as a field error, instead of coming back as a 500.
 */

/** `currency ~ '^[A-Z]{3}$'`, but empty is allowed and means "use PHP". */
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
/** Deliberately loose: this is a contact address, not an auth identity. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** One `{label, href}` entry — the shape `public.is_link_array()` demands. */
export const linkSchema = z.object({
  label: z.string().trim().min(1, "Every link needs a label."),
  href: z.string().trim().min(1, "Every link needs a URL."),
});

/** An uploaded Storage object, exactly as `ImageUploadField` holds it. */
export const uploadedImageSchema = z.object({
  url: z.string().min(1),
  path: z.string().min(1),
  alt: z.string(),
  width: z.number().int().min(0),
  height: z.number().int().min(0),
});

/** Shipping money: `> 0` is a real value, `0` means "fall back to the default". */
const shippingAmount = (label: string) =>
  z.coerce
    .number()
    .int(`${label} must be a whole number.`)
    .min(0, `${label} cannot be negative.`);

export const settingsSchema = z.object({
  title: z.string().trim().min(1, "Site title is required."),
  /** At most one logo file — `max={1}` turns the upload field into a picker. */
  logoImage: z.array(uploadedImageSchema).max(1),
  logoUrl: z.string().trim(),
  logoAlt: z.string().trim(),
  // The header only renders the logo when `width` is above zero, so an
  // external URL needs its dimensions typed in by hand.
  logoWidth: z.coerce.number().int("Width must be a whole number.").min(0),
  logoHeight: z.coerce.number().int("Height must be a whole number.").min(0),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value.length === 0 || CURRENCY_PATTERN.test(value), {
      message: "Three letters, e.g. PHP — or leave empty for the default.",
    }),
  freeShipThreshold: shippingAmount("Free shipping threshold"),
  standardShipping: shippingAmount("Standard shipping"),
  expressShipping: shippingAmount("Express shipping"),
  location: z.string().trim(),
  footerBlurb: z.string().trim(),
  contactEmail: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || EMAIL_PATTERN.test(value), {
      message: "Enter a valid email address, or leave it empty.",
    }),
  contactAddress: z.string().trim(),
  contactSocial: z.string().trim(),
  navLinks: z.array(linkSchema),
  bookNowLabel: z.string().trim(),
  bookNowUrl: z.string().trim(),
  socialLinks: z.array(linkSchema),
});

/**
 * What the controls hold. The number fields are `unknown` here because of
 * `z.coerce` — that is the point: a number input hands back a STRING, and the
 * schema is what turns it into a number.
 */
export type SettingsFormValues = z.input<typeof settingsSchema>;

/** What a successful parse yields — the shape the server action writes. */
export type SettingsValues = z.output<typeof settingsSchema>;
