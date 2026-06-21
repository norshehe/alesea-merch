# Alesea Merch — Frontend

A Next.js storefront for Alesea merch, backed by **Contentful** as the headless content & product source. No auth yet (guest browsing/checkout).

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

- **Content / data**: Contentful (Content Delivery API, Preview API for drafts). Single client in `src/lib/contentful/index.ts`. **Never** call `createClient` elsewhere.
- **Data layer**: Two-file pattern per content type / domain:
  - `*Client.ts` — raw Contentful calls that **normalize** entries to `I*` shapes (never leak raw Contentful `Entry` objects to the UI).
  - `*Handler.ts` — React Query hooks wrapping the client (`useGet*`). Export a `*Keys` query-key factory.
  - Shared helpers (`toImage`, `ICollection<T>`) in `src/lib/contentful/types/common.ts`.
- **State**: Zustand stores (`src/store/*.store.ts`) for global client state (cart). React Query for server state. **Cart is client state — never put product fetches in Zustand.**
- **Forms**: React Hook Form + Zod schemas (in `src/features/*/schemas/`), resolved via `@hookform/resolvers`.
- **UI**: Shadcn/Radix primitives in `src/components/ui/`, Lucide icons, Sonner toasts, Tailwind 4 tokens.
- **Auth**: None yet. Do not add auth libraries or guards unless explicitly asked.

### Project Structure

```
src/
├── app/                  # App Router routes (storefront pages)
├── app/providers/        # Root providers (QueryProvider)
├── features/             # Feature modules with own components, hooks, schemas, constants
├── components/ui/        # Shadcn/Radix base components
├── components/layout/    # Header, footer, navigation (create as needed)
├── hooks/                # Global hooks (useDebounce, etc.)
├── lib/contentful/       # Contentful client, *Client/*Handler per domain, types/
├── lib/utils.ts          # cn() and shared helpers
└── store/                # Zustand stores (cart)
```

### Conventions

- **Path alias**: `@/*` → `./src/*`
- **Type naming**: Interfaces prefixed with `I` (`IProduct`, `ICartLine`). Contentful entry skeletons suffixed `Skeleton` (`ProductSkeleton`).
- **Content types**: organized in `lib/contentful/types/<domain>/` with `response.ts` (skeleton + normalized `I*`), `query.ts`, and shared `common.ts`.
- **Normalize at the boundary**: clients map Contentful `Entry<Skeleton>` → `I*`. Components only ever see normalized shapes.
- **Query keys**: every handler exports a `*Keys` factory; never inline string arrays in `useQuery`.
- **Server vs Client components**: default to Server Components. Add `"use client"` only for interactivity (cart, forms, hooks). Fetch Contentful in Server Components or React Query handlers — never call clients from the server *and* duplicate in the client.
- **Error/empty/loading states**: every data surface needs all three (Skeleton, empty state, error message). Use `Skeleton` from `components/ui`.
- **Feedback**: Sonner (`toast`) for transient feedback only (item added to cart, form submitted). Form validation errors render inline via RHF + the form field components.
- **Images**: always `next/image`. Contentful URLs are normalized to `https:` by `toImage`.
- **Money**: format with `Intl.NumberFormat` using the product's `currency`. Never hardcode `$`.

### Environment Variables

See `.env.example` (copy to `.env.local`):

- `NEXT_PUBLIC_CONTENTFUL_SPACE_ID` / `CONTENTFUL_DELIVERY_TOKEN` — Contentful Delivery API
- `CONTENTFUL_PREVIEW_TOKEN` / `NEXT_PUBLIC_CONTENTFUL_PREVIEW` — draft preview
- `NEXT_PUBLIC_CONTENTFUL_ENVIRONMENT` — Contentful environment (default `master`)
- `NEXT_PUBLIC_SITE_URL` — canonical site URL

---

## Skills (`.agents/skills/`)

Consult the relevant skill **before writing code** to ensure pattern consistency. Skills are at `.agents/skills/{name}/SKILL.md`.

### Invocable Skills

| Skill                          | Purpose                                                               | Trigger when user says…                                                    |
| ------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `feature-scaffolder`           | Scaffold a feature module dir (components, schemas, hooks, constants)  | "create a new feature for X", "scaffold feature", "add a module for Y"      |
| `contentful-domain-scaffolder` | Generate Client + Handler + types for a new Contentful content type    | "add data for X", "connect the Y content type", "fetch Z from Contentful"   |
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
2. `contentful-domain-scaffolder` — generate client, handler, and types for the content type
3. `product-listing-page` — build the listing page (if the feature lists content)
4. `form-builder` — build forms/dialogs (if the feature has forms)
5. `cart-store` — only if cart interaction is involved

**Partial chains** (match to the user's actual request):

- "Add data for X" → `contentful-domain-scaffolder` only
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
