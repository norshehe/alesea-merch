---
name: feature-scaffolder
description: Scaffold a complete feature module directory with components, schemas, hooks, and constants following the alesea-merch feature module pattern. Use whenever the user wants to create a new feature, add a new module, scaffold a feature directory, set up a new domain in the features folder, or says things like "I need a new feature for X" or "create the feature structure for Y".
---

# Feature Scaffolder

Generate a feature module directory under `src/features/` following the alesea-merch convention. A feature module owns its UI, local hooks, form schemas, and constants — but **not** the data layer (that lives in `src/lib/supabase/`).

## Before Starting

Ask the user for (or infer):

- **Feature name** (kebab-case dir, e.g. `catalog`, `cart`, `checkout`, `collections`).
- **What it contains**: listing page? detail view? forms? cart interaction?
- **Does it need a new table?** If yes, add a migration in `supabase/migrations/`, regenerate types, then a `*Client.ts` under `src/lib/supabase/`.

## Directory structure

```
src/features/<feature>/
├── components/         # feature-specific components (not shared ui)
├── hooks/              # feature-local hooks (use-* ); global hooks go in src/hooks
├── schemas/            # Zod schemas for this feature's forms
├── constants/          # labels, enums, option lists
└── index.ts            # public surface — re-export what other modules consume
```

Only create the subdirectories the feature actually needs — don't generate empty `schemas/` if there are no forms.

## Rules

1. **No data layer here.** Clients live in `src/lib/supabase/<domain>/`. Features *consume* them, they don't define them.
2. **Shared vs feature components.** Generic primitives go in `src/components/ui/` (shadcn). Reusable cross-feature pieces go in `src/components/`. Feature-specific UI stays in the feature.
3. **Barrel `index.ts`** exports the feature's public components/hooks so routes import from `@/features/<feature>` cleanly.
4. **Zod schemas** in `schemas/` follow `form-builder` conventions; export both the schema and its inferred type.
5. **Naming**: components PascalCase files, hooks `use-*.ts`, constants UPPER_SNAKE for values.

## After scaffolding

- Wire the feature into a route under `src/app/` if it has pages.
- Tell the user the next skill in the chain (e.g. `product-listing-page` or `form-builder`).
