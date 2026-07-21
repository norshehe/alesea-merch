"use server";

import {
  createAirtableRecord,
  isAirtableConfigured,
  SIGNUPS_TABLE,
} from "@/lib/airtable";
import { emailSignupSchema } from "@/features/catalog/schemas/email-signup.schema";

export interface ICaptureEmailInput {
  email: string;
  /** Where the signup came from, e.g. "weekender-tote", "weekender-tote-teaser". */
  source: string;
}

type CaptureEmailResult = { ok: true } | { ok: false; error: string };

/**
 * Persist an email signup to the Airtable Signups table.
 *
 * Mirrors {@link placeOrder}: when Airtable is not configured the record is not
 * persisted but the call still succeeds so local/demo environments work. Email
 * is validated server-side; configured failures return a friendly message.
 *
 * `Created At` is intentionally omitted — Airtable created-time fields are
 * read-only and reject writes, so we let Airtable stamp it automatically.
 */
export async function captureEmail(
  input: ICaptureEmailInput,
): Promise<CaptureEmailResult> {
  const parsed = emailSignupSchema.safeParse({ email: input.email });
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email." };
  }

  const fields: Record<string, unknown> = {
    Email: parsed.data.email,
    Source: input.source,
  };

  if (!isAirtableConfigured()) {
    console.warn("[signups] Airtable not configured — email not persisted");
    return { ok: true };
  }

  try {
    await createAirtableRecord(fields, SIGNUPS_TABLE);
    return { ok: true };
  } catch (error) {
    console.error("[signups] Failed to persist email to Airtable:", error);
    return {
      ok: false,
      error: "We couldn't save your email. Please try again.",
    };
  }
}
