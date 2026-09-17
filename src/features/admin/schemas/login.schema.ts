import { z } from "zod";

/** Step one of admin sign-in: who to email the one-time code to. */
export const adminLoginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

export type AdminLoginValues = z.infer<typeof adminLoginSchema>;

/**
 * Step two: the numeric code from that email.
 *
 * A TYPED code, not a clicked link, is the whole point. Corporate mail scanners
 * (Microsoft Defender Safe Links is the one that bit us) fetch every URL in an
 * inbound message within a second of delivery, which spends a single-use
 * sign-in link before the recipient ever sees it. A scanner cannot type.
 *
 * The length is a RANGE, not six. Supabase's OTP length is a project setting —
 * this project currently issues eight digits — so pinning the check to the
 * familiar six would reject every real code. Supabase allows 6–10; the server
 * is the authority on whether the digits are right, and this only stops
 * obviously malformed input from costing a round trip.
 *
 * Whitespace is stripped before validation because the code is nearly always
 * pasted, and a trailing space from a double-click selection is not a reason to
 * refuse someone entry.
 */
export const adminOtpSchema = z.object({
  token: z
    .string()
    .transform((value) => value.replace(/\s+/g, ""))
    .pipe(
      z
        .string()
        .min(1, "Enter the code from your email")
        .regex(/^\d{6,10}$/, "The code is the digits from your email"),
    ),
});

export type AdminOtpValues = z.input<typeof adminOtpSchema>;
