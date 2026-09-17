"use server";

import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createSignup } from "@/lib/supabase/signup/signupClient";
import {
  emailSignupSchema,
  signupSourceSchema,
} from "@/features/catalog/schemas/email-signup.schema";

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

  // `source` is set by our own forms, never typed by a customer — so anything
  // that fails this is a hand-crafted request, and it is the field that decides
  // both dedup and which restock blast the row joins. See signupSourceSchema.
  const source = signupSourceSchema.safeParse(input.source);
  if (!source.success) {
    console.warn("[signups] Rejected signup with an invalid source");
    return { ok: false, error: "We couldn't save your email. Please try again." };
  }

  if (!isSupabaseAdminConfigured()) {
    console.warn("[signups] Supabase not configured — email not persisted");
    return { ok: true };
  }

  try {
    await createSignup({ email: parsed.data.email, source: source.data });
    return { ok: true };
  } catch (error) {
    console.error("[signups] Failed to persist email to Supabase:", error);
    return {
      ok: false,
      error: "We couldn't save your email. Please try again.",
    };
  }
}
