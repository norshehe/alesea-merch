import { z } from "zod";

/** Shared email-capture schema for signup / "Notify Me" forms. */
export const emailSignupSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

export type EmailSignupValues = z.infer<typeof emailSignupSchema>;
