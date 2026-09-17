import { z } from "zod";

/**
 * Mirrors `shop_categories` in `supabase/migrations/0003_content.sql`.
 * Anything the database would reject must fail HERE first, so the operator sees
 * a field error instead of a 500 from Postgres.
 */

/**
 * The `category_filter_key` enum. Deliberately a SUPERSET of the product
 * categories: `accessories` and `all` have no matching product category — the
 * first is a planned range, the second is the "shop everything" tile. Reusing
 * `PRODUCT_CATEGORIES` here would silently drop both.
 */
export const CATEGORY_FILTER_KEYS = [
  "tees",
  "bags",
  "caps",
  "tumblers",
  "accessories",
  "all",
] as const;

export type CategoryFilterKey = (typeof CATEGORY_FILTER_KEYS)[number];

/** What the tile's filter key means on the storefront, in an operator's words. */
export const CATEGORY_FILTER_KEY_LABELS: Record<CategoryFilterKey, string> = {
  tees: "Tees",
  bags: "Bags",
  caps: "Caps",
  tumblers: "Tumblers",
  // No product carries this category today — the tile would land on an empty
  // filter until one does.
  accessories: "Accessories (no products yet)",
  all: "All products",
};

/** One uploaded image, matching `ImageUploadField`'s `IUploadedImage`. */
export const categoryImageSchema = z.object({
  url: z.string().min(1),
  path: z.string().min(1),
  alt: z.string(),
  width: z.number().int().min(0),
  height: z.number().int().min(0),
});

export const categorySchema = z.object({
  label: z.string().trim().min(1, "Label is required."),
  // `eyebrow` is NOT NULL with a default of 'Collection'; an empty string is
  // legal in the database, so it stays optional here and the action fills the
  // default rather than the form pretending it is required.
  eyebrow: z.string().trim(),
  filterKey: z.enum(CATEGORY_FILTER_KEYS),
  /**
   * An array of at most one, because `ImageUploadField` speaks arrays. It maps
   * to the single `image_path` column.
   */
  image: z.array(categoryImageSchema).max(1),
  /**
   * The `image_url` half of the pair — an external image that was never
   * uploaded. Blank is the normal case.
   */
  imageUrl: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^https?:\/\/\S+$/i.test(value),
      "Enter a full URL starting with http:// or https://.",
    ),
  // `register()` on a number input hands back a STRING. Without coercion the
  // schema fails silently on every save.
  sortOrder: z.coerce.number().int("Sort order must be a whole number."),
  isActive: z.boolean(),
});

/**
 * What the form's inputs hold. `sortOrder` is `unknown` here because of
 * `z.coerce` — that is exactly the point: the control holds a string and the
 * schema is what turns it into a number.
 */
export type CategoryFormValues = z.input<typeof categorySchema>;

/** What a successful parse yields — the shape the server action writes. */
export type CategoryValues = z.output<typeof categorySchema>;
