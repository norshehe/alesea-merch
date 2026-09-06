import { z } from "zod";
import { uploadedImageSchema } from "@/features/admin/settings/schemas/settings.schema";

/**
 * Mirrors `home_content` in `supabase/migrations/0003_content.sql`.
 *
 * Like settings, nothing here is required: the home page merges every field
 * against `HOME_FALLBACK` (see `src/features/catalog/server/home.ts`), so a
 * blank field means "use the built-in copy", not "render nothing". The only
 * rule enforced is the one Postgres enforces — `is_assurance_array()` demands a
 * string `title` AND a string `body` on every element.
 */

/** One assurance card. Matches `public.is_assurance_array()`. */
export const assuranceSchema = z.object({
  title: z.string().trim().min(1, "Every assurance needs a title."),
  body: z.string().trim().min(1, "Every assurance needs a body."),
});

/** Each image is a `_path` (upload) / `_url` (external) pair; the path wins. */
const imagePair = {
  image: z.array(uploadedImageSchema).max(1),
  imageUrl: z.string().trim(),
};

export const homeSchema = z.object({
  title: z.string().trim().min(1, "Internal title is required."),

  heroEyebrow: z.string().trim(),
  heroHeading: z.string().trim(),
  heroBody: z.string().trim(),
  heroImage: imagePair.image,
  heroImageUrl: imagePair.imageUrl,
  heroPrimaryCta: z.string().trim(),

  categoryEyebrow: z.string().trim(),
  categoryHeading: z.string().trim(),
  categoryBody: z.string().trim(),

  assurances: z.array(assuranceSchema),

  editorialEyebrow: z.string().trim(),
  editorialHeading: z.string().trim(),
  editorialImage: imagePair.image,
  editorialImageUrl: imagePair.imageUrl,
  editorialCta: z.string().trim(),

  carryEyebrow: z.string().trim(),
  carryHeading: z.string().trim(),
  carryBody: z.string().trim(),
  carryImage: imagePair.image,
  carryImageUrl: imagePair.imageUrl,

  shorelineHandle: z.string().trim(),
  shorelineHeading: z.string().trim(),
  shorelineBody: z.string().trim(),
});

/** What the controls hold. */
export type HomeFormValues = z.input<typeof homeSchema>;

/** What a successful parse yields — the shape the server action writes. */
export type HomeValues = z.output<typeof homeSchema>;
