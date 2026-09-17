import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicUrl } from "@/lib/supabase/storage";
import type { IUploadedImage } from "@/features/admin/components/image-upload-field";
import type { IAssurance } from "@/lib/supabase/home/homeClient";

/**
 * Admin read for the `home_content` singleton, through the COOKIE-BOUND client
 * so RLS evaluates as the signed-in admin.
 *
 * Returns the row EXACTLY as stored — no merge against `HOME_FALLBACK`. The
 * form must show what is really saved, or an empty field would look configured
 * and saving it back would freeze today's copy into the database.
 *
 * The home page's category TILES are not here: they live in `shop_categories`
 * and are managed at /admin/categories.
 */

/** The `home_content` row in the shape the form's controls hold. */
export interface IAdminHomeContent {
  title: string;

  heroEyebrow: string;
  heroHeading: string;
  heroBody: string;
  heroImage: IUploadedImage[];
  heroImageUrl: string;
  heroPrimaryCta: string;

  categoryEyebrow: string;
  categoryHeading: string;
  categoryBody: string;

  assurances: IAssurance[];

  editorialEyebrow: string;
  editorialHeading: string;
  editorialImage: IUploadedImage[];
  editorialImageUrl: string;
  editorialCta: string;

  carryEyebrow: string;
  carryHeading: string;
  carryBody: string;
  carryImage: IUploadedImage[];
  carryImageUrl: string;

  shorelineHandle: string;
  shorelineHeading: string;
  shorelineBody: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `assurances` is `jsonb` — constrained by the DB, untrusted by the types. */
function toAssurances(raw: unknown): IAssurance[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (entry: unknown): entry is { title: string; body: string } =>
        isRecord(entry) &&
        typeof entry.title === "string" &&
        typeof entry.body === "string",
    )
    .map((entry) => ({ title: entry.title, body: entry.body }));
}

/**
 * A `_path` column as the upload field holds it: zero or one image. Dimensions
 * are not stored for content images, so they come back as 0 — these images are
 * rendered with `fill`, not with intrinsic width/height.
 */
function toUpload(path: string | null): IUploadedImage[] {
  const url = publicUrl(path);
  if (!path || !url) return [];
  return [{ url, path, alt: "", width: 0, height: 0 }];
}

/**
 * The home content row, or null when it is missing. Null should be impossible
 * (the migration seeds `id = 1`), so the page treats it as an unmigrated
 * database rather than as an empty form.
 */
export async function getAdminHomeContent(): Promise<IAdminHomeContent | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("home_content")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("[admin-home] read failed", error);
    throw new Error("Could not load home content.");
  }
  if (!data) return null;

  return {
    title: data.title ?? "",

    heroEyebrow: data.hero_eyebrow ?? "",
    heroHeading: data.hero_heading ?? "",
    heroBody: data.hero_body ?? "",
    heroImage: toUpload(data.hero_image_path),
    heroImageUrl: data.hero_image_url ?? "",
    heroPrimaryCta: data.hero_primary_cta ?? "",

    categoryEyebrow: data.category_eyebrow ?? "",
    categoryHeading: data.category_heading ?? "",
    categoryBody: data.category_body ?? "",

    assurances: toAssurances(data.assurances),

    editorialEyebrow: data.editorial_eyebrow ?? "",
    editorialHeading: data.editorial_heading ?? "",
    editorialImage: toUpload(data.editorial_image_path),
    editorialImageUrl: data.editorial_image_url ?? "",
    editorialCta: data.editorial_cta ?? "",

    carryEyebrow: data.carry_eyebrow ?? "",
    carryHeading: data.carry_heading ?? "",
    carryBody: data.carry_body ?? "",
    carryImage: toUpload(data.carry_image_path),
    carryImageUrl: data.carry_image_url ?? "",

    shorelineHandle: data.shoreline_handle ?? "",
    shorelineHeading: data.shoreline_heading ?? "",
    shorelineBody: data.shoreline_body ?? "",
  };
}
