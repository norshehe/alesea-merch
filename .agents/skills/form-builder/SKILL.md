---
name: form-builder
description: Build a complete form or dialog with a Zod schema, React Hook Form, submission handling, and proper error/success feedback following alesea-merch conventions. Use whenever the user wants to create a form, add a dialog form, build a newsletter/contact/checkout form, add validation, or says things like "create a form for X", "add a dialog to capture Y", "build the checkout form", or "I need a form component".
---

# Form Builder

Generate forms following the alesea-merch pattern: Zod schema + React Hook Form + shadcn `Form` components + clear submit/error/success feedback.

Read before building:

- `form-field-reference` — which `Form*` field component to use for each input
- `button-variant-guide` — submit/cancel button variants
- `src/components/ui/form.tsx` — the shadcn Form primitives

## Pattern

### 1. Schema (`src/features/<feature>/schemas/<name>.schema.ts`)

```ts
import { z } from "zod";

export const newsletterSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export type NewsletterValues = z.infer<typeof newsletterSchema>;
```

### 2. Form component (`src/features/<feature>/components/<name>-form.tsx`)

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { newsletterSchema, type NewsletterValues } from "../schemas/newsletter.schema";

export function NewsletterForm() {
  const form = useForm<NewsletterValues>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: NewsletterValues) {
    try {
      // submit (server action / route handler / external endpoint)
      toast.success("You're subscribed!");
      form.reset();
    } catch {
      // Submission failures: show an inline message or a single toast — never swallow silently.
      toast.error("Something went wrong. Please try again.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Subscribing…" : "Subscribe"}
        </Button>
      </form>
    </Form>
  );
}
```

## Rules

1. **Validation errors render inline** via `<FormMessage />` — never as toasts.
2. **Submit state**: disable the submit button and show a pending label while `isSubmitting`.
3. **Success/failure feedback**: Sonner `toast` for transient confirmation; reset the form on success.
4. **Dialogs**: wrap the form in `Dialog`/`Sheet` from `src/components/ui`; clear the form when the dialog opens/closes.
5. **No `any`.** Always type the form with `z.infer<typeof schema>`.
6. **Checkout/payment forms**: keep PII handling minimal (no auth yet); never log form values.

## After building

- Run `pnpm exec tsc --noEmit`.
- If the form posts somewhere, confirm the endpoint/server action exists or stub it clearly.
