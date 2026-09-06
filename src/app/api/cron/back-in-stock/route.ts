import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runBackInStockNotifications } from "@/features/notifications/server/back-in-stock";

/**
 * Scheduled back-in-stock notification run.
 *
 * Invoked by Vercel Cron (see `vercel.json`), which sends
 * `Authorization: Bearer $CRON_SECRET`. The same header works for a manual
 * `curl` when you want to trigger a run by hand.
 *
 * Always dynamic: it reads live Airtable data and sends mail, so it must never
 * be prerendered or cached.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Compare the presented bearer token to the secret without leaking its length
 * or contents through timing.
 *
 * `===` on strings short-circuits at the first differing byte, so response time
 * correlates with how many leading characters are right — enough, over many
 * requests, to reconstruct the secret one character at a time. `timingSafeEqual`
 * throws on differing lengths, so the length is checked first and its result is
 * folded in at the end rather than returned early: a wrong-length guess costs
 * exactly one full comparison against the secret and reveals nothing.
 */
function matchesSecret(presented: string, secret: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  const sameLength = a.length === b.length;
  return timingSafeEqual(sameLength ? a : b, b) && sameLength;
}

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;

  // Fail closed: without a configured secret the endpoint stays shut rather
  // than becoming a public "email all my customers" button.
  if (!secret) {
    console.error("[back-in-stock] CRON_SECRET is not set — refusing to run.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const presented = request.headers.get("authorization") ?? "";
  if (!matchesSecret(presented, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await runBackInStockNotifications();
    console.info("[back-in-stock] run complete", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[back-in-stock] run failed", error);
    return NextResponse.json({ error: "Run failed." }, { status: 500 });
  }
}
