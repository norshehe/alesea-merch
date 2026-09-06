---
name: admin-shared-component-gaps
description: Known gaps in the admin's shared Field/form primitives (src/features/admin/components) surfaced during the first full admin UI/UX audit — check these before greenlighting new admin forms.
metadata:
  type: project
---

Two systemic gaps found in the internal admin (`src/app/(admin)/**`, `src/features/admin/**`) during the 2026-09-06 UI/UX audit, both traced to the shared `Field` primitive at `src/features/admin/components/field.tsx`:

1. **No `aria-describedby` wiring.** `Field` computes a `describedBy` id (`${htmlFor}-error` / `${htmlFor}-hint`) and attaches it only to its own `<p>`, never to `children`. Every consumer (product/category forms, settings/home tabbed forms, order notes, login) independently fails to pass `aria-describedby` on the control either. Net effect: `aria-invalid` fires, but the actual error message is never announced to assistive tech. Also no consumer sets `aria-required`/`required` (forms use `noValidate` so native validation is off), so the `Field` required asterisk (`aria-hidden="true"`) is sighted-only too.
2. **No unsaved-changes guard except in the inventory grid.** `inventory-grid.tsx` adds a `beforeunload` listener keyed off dirty state, explicitly reasoned about in a comment. `product-form.tsx`, `category-form.tsx`, `settings-form.tsx`, `home-form.tsx` — the forms with the most typing at stake (settings/home are multi-tab) — have no equivalent, so a stray sidebar click mid-edit loses everything silently.

**How to apply**: when reviewing or building a new admin form, check whether it (a) reuses `Field` as-is (inherits gap #1 for free — flag it, but it's pre-existing across the whole app, not a new regression) and (b) has a dirty-check navigation guard if it's a form with more than one or two fields. Don't re-flag these as brand-new findings in every review; reference this memory and note whether the specific PR made it better or worse.

Also noted: boolean/switch fields (`Coming soon` in product-form, `Visible` in category-form) bypass `Field` entirely with hand-rolled label markup — consistent between the two instances, but a second "labeled control" pattern in parallel with `Field`.

See also [[admin-table-consistency]] for a related but separate finding about `InventoryGrid` not reusing the shared `Table` primitives.
