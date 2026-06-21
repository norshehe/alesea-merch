---
name: form-field-reference
description: Reference guide for the shadcn Form primitives and which input component to use for each field type in alesea-merch forms. Read when adding form fields, building forms, or unsure which component to use. Trigger examples - "add an email field", "which component for a quantity input", "add a country select", "what fields are available".
---

# Form Field Reference

Forms use shadcn's `Form` primitives (`@/components/ui/form`) wrapping React Hook Form, with inputs from `@/components/ui/*`. Read with `form-builder`.

## The Form primitives

| Component       | Role                                                            |
| --------------- | -------------------------------------------------------------- |
| `Form`          | Provider — spread `{...form}` from `useForm`                    |
| `FormField`     | Binds a field via `control` + `name`, exposes `field` in render |
| `FormItem`      | Wrapper for one field (spacing + context)                       |
| `FormLabel`     | Accessible label, auto-associated                              |
| `FormControl`   | Wraps the actual input so a11y attrs apply                     |
| `FormDescription` | Optional helper text                                          |
| `FormMessage`   | Renders the field's Zod validation error                       |

## Input component by field type

| Need                     | Component                              | Notes                                              |
| ------------------------ | ------------------------------------- | -------------------------------------------------- |
| Short text / email       | `Input`                               | set `type="email"` etc.                            |
| Number / quantity        | `Input type="number"`                 | coerce in Zod: `z.coerce.number()`                 |
| Long text                | `Textarea` (add via shadcn if needed) | `pnpm dlx shadcn add textarea`                     |
| Single choice (few)      | `RadioGroup` (add via shadcn)         |                                                    |
| Single choice (many)     | `Select`                              | already installed                                  |
| Boolean                  | `Checkbox` / `Switch` (add via shadcn)|                                                    |
| Date                     | `Calendar` + `Popover` (add via shadcn)|                                                   |

Add missing primitives with `pnpm dlx shadcn@latest add <name>` — don't hand-roll inputs.

## Zod tips

- Email: `z.string().email("…")`
- Number from input: `z.coerce.number().min(1)`
- Optional with default: `z.string().optional()` / `.default("")`
- Always export `type X = z.infer<typeof schema>` and type `useForm<X>`.

## Rules

- Every field: `FormField` → `FormItem` → `FormLabel` + `FormControl(input)` + `FormMessage`.
- Never show validation errors via toast — `<FormMessage />` only.
- Self-contained select options come from `constants/` in the feature, not inline literals when reused.
