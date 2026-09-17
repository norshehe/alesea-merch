import { z } from "zod";

/** Shared email-capture schema for signup / "Notify Me" forms. */
export const emailSignupSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

export type EmailSignupValues = z.infer<typeof emailSignupSchema>;

/**
 * The form-placement label a signup came from, e.g. `weekender-tote-teaser`.
 *
 * Validated as strictly as the email, because it is not a passive label:
 *
 *  * `signups` is uniquely indexed on `(lower(email), source)`, so a varying
 *    `source` defeats the dedup entirely — the same address can be inserted
 *    unboundedly by changing one character, growing the table without limit.
 *  * `slugForSource()` matches any source that STARTS WITH a product slug plus
 *    `-`, so `weekender-tote-<anything>` enrols whoever is named in the row into
 *    the next restock blast — sent from the verified SendGrid domain. An
 *    attacker choosing both the address and the source is choosing who we mail.
 *
 * The character class matches `products_slug_format` (0002) extended with the
 * `-<placement>` suffix, which is every source the app actually produces.
 */
export const signupSourceSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/);
