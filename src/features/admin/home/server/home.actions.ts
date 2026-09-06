"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/admin/server/auth";
import {
  homeSchema,
  type HomeFormValues,
  type HomeValues,
} from "@/features/admin/home/schemas/home.schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Write path for the `home_content` singleton.
 *
 * `requireAdmin()` first, then a server-side re-parse: the client schema is a
 * UX affordance, not a security boundary.
 *
 * `revalidatePath` is called here rather than through
 * `features/admin/server/revalidate.ts` to keep this feature self-contained.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

interface IPostgresError {
  code?: string;
  message: string;
}

function isPostgresError(error: unknown): error is IPostgresError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

function toMessage(error: unknown, fallback: string): string {
  if (!isPostgresError(error)) return fallback;

  if (error.code === "23514") {
    if (error.message.includes("home_assurances_shape")) {
      return "Every assurance needs both a title and a body.";
    }
    return "That change breaks a database rule — check the assurances.";
  }

  return fallback;
}

function firstIssue(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Some fields need attention.";
}

/** `_path` (upload) / `_url` (external) pair. The path wins on render. */
function imagePair(images: HomeValues["heroImage"], url: string) {
  return {
    path: images[0]?.path ?? null,
    url: url.length > 0 ? url : null,
  };
}

function toRow(values: HomeValues) {
  const hero = imagePair(values.heroImage, values.heroImageUrl);
  const editorial = imagePair(values.editorialImage, values.editorialImageUrl);
  const carry = imagePair(values.carryImage, values.carryImageUrl);

  return {
    title: values.title,

    hero_eyebrow: values.heroEyebrow,
    hero_heading: values.heroHeading,
    hero_body: values.heroBody,
    hero_image_path: hero.path,
    hero_image_url: hero.url,
    hero_primary_cta: values.heroPrimaryCta,

    category_eyebrow: values.categoryEyebrow,
    category_heading: values.categoryHeading,
    category_body: values.categoryBody,

    assurances: values.assurances,

    editorial_eyebrow: values.editorialEyebrow,
    editorial_heading: values.editorialHeading,
    editorial_image_path: editorial.path,
    editorial_image_url: editorial.url,
    editorial_cta: values.editorialCta,

    carry_eyebrow: values.carryEyebrow,
    carry_heading: values.carryHeading,
    carry_body: values.carryBody,
    carry_image_path: carry.path,
    carry_image_url: carry.url,

    shoreline_handle: values.shorelineHandle,
    shoreline_heading: values.shorelineHeading,
    shoreline_body: values.shorelineBody,
  };
}

/**
 * Save the one home content row.
 *
 * `update ... eq("id", 1)`: the migration seeds the row and `check (id = 1)`
 * makes a second one impossible, so no upsert dance is needed. The insert only
 * covers a database where that seed never ran.
 */
export async function saveHomeContent(
  values: HomeFormValues,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = homeSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: firstIssue(parsed.error.issues) };
  }

  const supabase = await createSupabaseServerClient();
  const row = toRow(parsed.data);

  try {
    const { data, error } = await supabase
      .from("home_content")
      .update(row)
      .eq("id", 1)
      .select("id")
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      // Defensive: no seeded row (an unmigrated or manually emptied database).
      const { error: insertError } = await supabase
        .from("home_content")
        .insert({ id: 1, ...row });
      if (insertError) throw insertError;
    }

    // Only the home page reads this row — no `"layout"` here, unlike settings,
    // which feed the header and footer rendered by the root layout.
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("[admin-home] save failed", error);
    return { ok: false, error: toMessage(error, "Could not save home content.") };
  }
}
