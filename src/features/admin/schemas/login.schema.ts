import { z } from "zod";

/** Admin sign-in is email-only — the magic link is the credential. */
export const adminLoginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

export type AdminLoginValues = z.infer<typeof adminLoginSchema>;
