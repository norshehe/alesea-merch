"use server";

import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createSignup } from "@/lib/supabase/signup/signupClient";
import { emailSignupSchema } from "@/features/catalog/schemas/email-signup.schema";

export interface ICaptureEmailInput {
  email: string;
  /** Where the signup came from, e.g. "weekender-tote", "weekender-tote-teaser". */
  source: string;
}

type CaptureEmailResult = { ok: true } | { ok: false; error: string };

/**
 * Persist an email signup to the `signups` table.
 *
 * Mirrors {@link placeOrder}: when Supabase is not configured the record is not
 * persisted but the call still succeeds so local/demo environments work. Email
 * is validated server-side; configured failures return a friendly message.
 * A repeat signup is a no-op rather than an error — see `createSignup`.
 */
export async function captureEmail(
  input: ICaptureEmailInput,
): Promise<CaptureEmailResult> {
  const parsed = emailSignupSchema.safeParse({ email: input.email });
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email." };
  }

  if (!isSupabaseAdminConfigured()) {
    console.warn("[signups] Supabase not configured — email not persisted");
    return { ok: true };
  }

  try {
    await createSignup({ email: parsed.data.email, source: input.source });
    return { ok: true };
  } catch (error) {
    console.error("[signups] Failed to persist email to Supabase:", error);
    return {
      ok: false,
      error: "We couldn't save your email. Please try again.",
    };
  }
}
