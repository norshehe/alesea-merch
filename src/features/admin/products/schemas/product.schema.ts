import { z } from "zod";

/**
 * Mirrors the CHECK constraints in `supabase/migrations/0002_products.sql`
 * one-for-one. Anything the database would reject must fail HERE first, so the
 * operator sees a field error instead of a 500 from Postgres.
 */

export const PRODUCT_CATEGORIES = ["tees", "bags", "caps", "tumblers"] as const;
export const PRODUCT_STATUSES = ["draft", "published"] as const;

/** `products_slug_format` */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** `is_color_array()` */
const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;
/** `currency ~ '^[A-Z]{3}$'` */
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export const productColorSchema = z.object({
  name: z.string().trim().min(1, "Give the colour a name."),
  hex: z.string().trim().regex(HEX_PATTERN, "Use a 6-digit hex, e.g. #084e50."),
});

export const productImageSchema = z.object({
  url: z.string().min(1),
  path: z.string().min(1),
  alt: z.string(),
  width: z.number().int().min(0),
  height: z.number().int().min(0),
});

export const productSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required."),
    slug: z
      .string()
      .trim()
      .min(1, "Slug is required.")
      .regex(SLUG_PATTERN, "Lowercase letters, numbers and single dashes only."),
    category: z.enum(PRODUCT_CATEGORIES),
    // `register()` on a number input hands back a STRING. Without coercion the
    // schema fails silently on every save.
    price: z.coerce
      .number()
      .int("Price must be a whole number.")
      .min(0, "Price cannot be negative."),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(CURRENCY_PATTERN, "Three letters, e.g. PHP."),
    blurb: z.string(),
    materials: z.string(),
    sizeLabel: z.string().trim().min(1, "Size label is required."),
    sizes: z.array(z.string().trim().min(1)),
    colors: z.array(productColorSchema),
    comingSoon: z.boolean(),
    sortOrder: z.coerce.number().int("Sort order must be a whole number."),
    status: z.enum(PRODUCT_STATUSES),
    images: z.array(productImageSchema),
  })
  // `products_price_or_coming_soon`: only a teaser may cost nothing.
  .refine((values) => values.comingSoon || values.price > 0, {
    message: "Set a price, or mark the product as coming soon.",
    path: ["price"],
  });

/**
 * What the form's inputs hold. `price`/`sortOrder` are `unknown` here because
 * of `z.coerce` — that is exactly the point: the controls hold strings and the
 * schema is what turns them into numbers.
 */
export type ProductFormValues = z.input<typeof productSchema>;

/** What a successful parse yields — the shape the server action writes. */
export type ProductValues = z.output<typeof productSchema>;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/**
 * Title → slug. Used only while CREATING: rewriting the slug of a live product
 * silently changes its public URL and 404s every link to it.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
