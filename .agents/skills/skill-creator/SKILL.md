---
name: skill-creator
description: Create new project skills and improve existing ones for the alesea-merch repo. Use when the user wants to create a skill from scratch, turn a repeated workflow into a skill, update or optimize an existing skill, or improve a skill's description so it triggers reliably.
---

# Skill Creator

Create and improve skills in `.agents/skills/`. A good project skill captures a *repeatable, project-specific* pattern so the codebase stays consistent.

## What makes a good skill here

- **Project-specific**: encodes alesea-merch conventions (Contentful two-file layer, cart store, Server/Client split, money/image rules) — not generic advice.
- **Points at real reference files** in the repo so the model matches existing patterns instead of inventing.
- **Has a precise `description`** with concrete trigger phrases — this is what determines whether the skill fires.

## Anatomy

```
.agents/skills/<name>/SKILL.md
---
name: <kebab-case-name>            # must match the directory
description: <what it does> + Use when… + trigger phrases users actually say
---
# Title
Body: prerequisites, file structure, rules, templates, "after building" checks.
```

## Process

1. **Clarify intent.** What pattern should this standardize? Invocable (does work) or reference (read-only guide)?
2. **Find the reference implementation** in the repo the skill should mirror; cite those paths.
3. **Draft** the SKILL.md: tight description, numbered non-negotiable rules, minimal code templates, a post-step verification (`pnpm exec tsc --noEmit`).
4. **Register it** in `CLAUDE.md`:
   - Invocable skill → add a row to the *Invocable Skills* table with trigger phrases.
   - Reference guide → add to the *Reference Guides* list.
   - Add it to *Skill Chaining* if it belongs in the feature-build sequence.
5. **Sanity-check the description.** Read it cold: would the right user phrasing trigger it, and would unrelated requests *not*? Tighten wording and trigger examples until both hold.

## Writing strong descriptions

- Lead with the action ("Scaffold…", "Build…", "Reference guide for…").
- Add "Use when…" + 3–6 real trigger phrases in the user's words.
- For reference guides, say "Read this; do not invoke as a workflow step."

## Improving an existing skill

- If it isn't triggering: the description is too vague or missing trigger phrases — fix that first.
- If output drifts from conventions: tighten the rules and add/point to a concrete reference file.
- Keep skills focused — split a bloated skill rather than letting it sprawl.
