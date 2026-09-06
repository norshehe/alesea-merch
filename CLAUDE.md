# Alesea Merch — Frontend

A Next.js storefront for Alesea merch, backed by **Supabase** (Postgres + Storage + Auth) as the single source of truth for products, inventory, orders, signups and site content. Guest browsing/checkout — customers never authenticate. An internal admin lives at `/admin` behind Supabase Auth.

> **Migrated off Contentful + Airtable.** Do not reintroduce either. If you find a reference to them in older docs or skills, it is stale.

> **Next.js 16** — this version has breaking changes vs. older training data (async `params`/`searchParams`, caching, App Router APIs). When unsure about a Next.js API, read the relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.

## Skill System Lanes

Three skill systems coexist — each has a distinct lane:

| System             | Location          | Use for                                                                  |
| ------------------ | ----------------- | ------------------------------------------------------------------------ |
| **Project skills** | `.agents/skills/` | alesea-specific code patterns (scaffolding, content layer, pages, forms) |
| **Claude skills**  | `.claude/skills/` | Design intelligence and general-purpose skills                           |
| **SuperClaude**    | `/sc:*` commands  | Orchestration, planning, research, brainstorming                         |

Never mix lanes. `/sc:implement` is not a substitute for `feature-scaffolder` + `frontend-engineer`.

### Key Layers

- **Content / data**: Supabase Postgres. Migrations in `supabase/migrations/`; generated types in `src/lib/supabase/types.ts` (regenerate after every migration).
- **Three clients, and picking the wrong one breaks things silently:**
  - `src/lib/supabase/public.ts` — anon, **cookie-less**, for every storefront read. It is a plain `createClient`, NOT `@supabase/ssr`, because `createServerClient` needs `cookies()`, and calling that in the storefront root layout opts the whole app into dynamic rendering and silently kills ISR. Nothing errors; the site just stops being static.
  - `src/lib/supabase/admin.ts` — service role, `server-only`. Bypasses RLS. Only for order/signup writes and the cron. Never import it outside server code.
  - `@supabase/ssr` cookie-bound clients — `/admin` routes only.
- **Data layer**: `*Client.ts` per domain under `src/lib/supabase/`, normalizing rows to `I*` shapes. Components never see raw rows.
- **RLS is the security boundary**, not application code. Anon can read published products and site content; it has **no policy at all** on `orders` and `signups`, so a leaked anon key cannot export customer data. Run `get_advisors` after any schema change.
- **State**: Zustand stores (`src/store/*.store.ts`) for global client state (cart). React Query for server state. **Cart is client state — never put product fetches in Zustand.**
- **Forms**: React Hook Form + Zod schemas (in `src/features/*/schemas/`), resolved via `@hookform/resolvers`.
- **UI**: Shadcn/Radix primitives in `src/components/ui/`, Lucide icons, Sonner toasts, Tailwind 4 tokens.
- **Auth**: Supabase Auth (magic link, invite-only) guards `/admin` only. Customers never log in — do not add auth to the storefront. Route protection lives in `src/proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`).

### Project Structure

```
src/
├── app/                  # App Router routes (storefront pages)
├── app/providers/        # Root providers (QueryProvider)
├── features/             # Feature modules with own components, hooks, schemas, constants
├── components/ui/        # Shadcn/Radix base components
├── components/layout/    # Header, footer, navigation (create as needed)
├── hooks/                # Global hooks (useDebounce, etc.)
├── lib/supabase/         # public/admin clients, *Client per domain, generated types
├── proxy.ts              # Next 16 route protection (was middleware.ts)
├── lib/utils.ts          # cn() and shared helpers
└── store/                # Zustand stores (cart)
```

### Conventions

- **Path alias**: `@/*` → `./src/*`
- **Type naming**: Interfaces prefixed with `I` (`IProduct`, `ICartLine`).
- **Domain types**: organized in `lib/supabase/types/<domain>/` with the normalized `I*` shapes, plus shared helpers in `types/common.ts`. Generated row types live in `lib/supabase/types.ts` — never hand-edit them.
- **Normalize at the boundary**: clients map database rows → `I*`. Components only ever see normalized shapes. `ICatalogProduct`, `ISiteSettings`, `IHomeContent` and `getInventory()`'s `Map<"slug|color|size", number>` are a frozen contract — changing them means touching every component.
- **Query keys**: every handler exports a `*Keys` factory; never inline string arrays in `useQuery`.
- **Server vs Client components**: default to Server Components. Add `"use client"` only for interactivity (cart, forms, hooks). Fetch data in Server Components — never duplicate a server fetch in the client.
- **Error/empty/loading states**: every data surface needs all three (Skeleton, empty state, error message). Use `Skeleton` from `components/ui`.
- **Feedback**: Sonner (`toast`) for transient feedback only (item added to cart, form submitted). Form validation errors render inline via RHF + the form field components.
- **Images**: always `next/image`, served from the public `media` bucket in Supabase Storage. Storage returns no dimensions, so `width`/`height`/`alt` are Postgres columns — capture dimensions at upload. Any new image host must be added to `next.config.ts` `remotePatterns` or it 500s.
- **Money**: format with `Intl.NumberFormat` using the product's `currency`. Never hardcode `$`.

### Environment Variables

See `.env.example` (copy to `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public; RLS is what protects the data
- `SUPABASE_SERVICE_ROLE_KEY` — **secret**, bypasses RLS. Server-only; never prefix with `NEXT_PUBLIC_`
- `NEXT_PUBLIC_SITE_URL` — canonical site URL
- `SENDGRID_*` — back-in-stock notification email
- `CRON_SECRET` / `BACK_IN_STOCK_SEND` — cron auth and the live-send arming flag (see `docs/BACK_IN_STOCK_NOTIFICATIONS.md`)

---

## Skills (`.agents/skills/`)

Consult the relevant skill **before writing code** to ensure pattern consistency. Skills are at `.agents/skills/{name}/SKILL.md`.

### Invocable Skills

| Skill                          | Purpose                                                               | Trigger when user says…                                                    |
| ------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `feature-scaffolder`           | Scaffold a feature module dir (components, schemas, hooks, constants)  | "create a new feature for X", "scaffold feature", "add a module for Y"      |
| `contentful-domain-scaffolder` | **RETIRED** — generates Contentful clients for a codebase that has none. Do not invoke. Add a `*Client.ts` under `src/lib/supabase/` instead. | — |
| `product-listing-page`         | Build a product grid/catalog page with search, filters, pagination    | "create a product list", "build the catalog page", "show all products"      |
| `form-builder`                 | Build a form/dialog with Zod + React Hook Form + error handling        | "create a form for X", "add a newsletter form", "build a checkout form"     |
| `cart-store`                   | Add to / extend the Zustand cart store and cart UI                     | "add to cart", "build the cart", "track cart state", "cart drawer"          |
| `commit`                       | Commit changes with auto-generated conventional message, optional push | "commit", "commit my changes", "save my work", "/commit"                    |
| `skill-creator`                | Create or improve skills                                               | "create a skill for X", "improve this skill", "turn this into a skill"      |

### Reference Guides (read, don't invoke)

Documentation files — read them when implementing, do not invoke as skill steps:

- `page-patterns` — UI patterns (sections, grids, dialogs, skeletons, empty/error states, animations)
- `form-field-reference` — Form field components, props, schemas
- `button-variant-guide` — Button variant and size selection for any UI context
- `nextjs-performance-ui` — Next.js performance, minimalist Tailwind design, Server Components, images, Core Web Vitals

### Skill Chaining

When building a full feature end-to-end, chain skills in dependency order based on the scope of the request:

**Full feature build** (user says "build me the X feature"):

1. `feature-scaffolder` — create the directory structure
2. Add a `*Client.ts` under `src/lib/supabase/` normalizing rows to `I*` shapes (write a migration first if the table is new)
3. `product-listing-page` — build the listing page (if the feature lists content)
4. `form-builder` — build forms/dialogs (if the feature has forms)
5. `cart-store` — only if cart interaction is involved

**Partial chains** (match to the user's actual request):

- "Add data for X" → migration in `supabase/migrations/`, regenerate types, then a `*Client.ts`
- "Create a page to list X" → `product-listing-page` (assumes the content type exists)
- "Add a form for X" → `form-builder`
- "Add to cart" → `cart-store`

Always use `page-patterns`, `form-field-reference`, and `nextjs-performance-ui` as reference guides when implementing — don't invoke them as standalone steps unless the user is explicitly asking about patterns.

---

## Agent Strategy

**IMPORTANT**: Use the `frontend-engineer` agent (`.claude/agents/frontend-engineer.md`) for ALL code implementation tasks — new components, pages, features, refactors, bug fixes, and any file modifications. The main agent focuses on planning, coordination, and review.

**IMPORTANT**: Spawn review agents based on change size — do not review every trivial edit:

| Change size                                                 | Rule                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------ |
| **Trivial** — 1 file, <20 lines, isolated fix               | No reviewer — do it directly                                 |
| **Medium** — 1–3 files, or a single component/form          | `senior-code-reviewer` only                                  |
| **Large** — 4+ files, new feature, or any UI surface change | `senior-code-reviewer` + `ui-ux-design-reviewer` in parallel |

If the reviewer finds Critical or Major issues, fix them before reporting back to the user.

### End-to-end flow

1. **Plan** — understand requirements, design approach.
2. **Implement** — `frontend-engineer`, using skills in dependency order (see Skill Chaining).
3. **Review** — `senior-code-reviewer` (always, for medium+) + `ui-ux-design-reviewer` (UI changes). Run in parallel.
4. **Fix** any Critical or Major issues found before reporting back.
5. **Build check** — only spawn `nextjs-build-fixer` if the user explicitly requests it.

### Reactive agents

- `error-fixer` — diagnose & fix runtime errors, type errors, crashes (use when an error/stack trace appears).
- `nextjs-build-fixer` — run lint + build and fix all type/lint/build errors (on request or after large refactors).

---

## Response Checkpoints

**Every response that modifies files must produce a unique checkpoint ID** so the user can revert that response (and everything after it) by referencing the ID. Skip for responses that only read, explain, or run non-mutating commands.

### Creating a checkpoint (before the first Edit/Write call)

Snapshot the full working tree (staged + unstaged) to a Claude-only ref. This does **not** modify `HEAD`, the current branch, or the working tree:

```bash
ID=$(openssl rand -hex 4)
git add -A -N                                             # track untracked files in the index without staging content
git add -A
TREE=$(git write-tree)
COMMIT=$(git commit-tree "$TREE" -p HEAD -m "ckpt $ID")
git update-ref "refs/claude/ckpt-$ID" "$COMMIT"
git reset -q                                              # unstage everything, leaving the working tree untouched
```

Report the ID on the **final line** of the response:

```
🔖 Checkpoint: <ID>
```

### Reverting

When the user says "revert <ID>", "undo <ID>", or similar:

```bash
git read-tree -u --reset "refs/claude/ckpt-<ID>"
git reset -q
```

This restores the working tree and index to the pre-response state, discarding every change made in that response **and every response after it**. Confirm which ID was restored and briefly list the files that reverted.

### Listing / Pruning

```bash
# list
git for-each-ref --sort=-creatordate --format='%(refname:lstrip=3)  %(creatordate:iso8601)  %(subject)' refs/claude/
# prune
git for-each-ref --format='%(refname)' refs/claude/ | xargs -n1 git update-ref -d
```

### Rules

- **Never** create a checkpoint on a turn that does not modify files.
- **Never** emit a checkpoint ID inside a tool call, plan, or mid-response text — only on the final line.
- Checkpoints live in `refs/claude/*` and are invisible to normal git workflows.
- If `git rev-parse HEAD` fails (no commits yet), skip checkpointing and tell the user.
