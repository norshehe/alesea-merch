---
name: admin-table-consistency
description: InventoryGrid hand-rolls its own <table> instead of reusing src/components/ui/table.tsx, unlike every other admin data table — check on future inventory/table changes.
metadata:
  type: project
---

Every admin list surface (dashboard recent orders, products, orders, signups, categories) renders its table via the shared shadcn primitives in `src/components/ui/table.tsx` (`Table`, `TableHeader`, `TableRow`, `TableHead`, `TableCell` — these bake in `hover:bg-muted/50` row highlighting and consistent `h-10`/`p-2` spacing).

`src/features/admin/inventory/components/inventory-grid.tsx` is the one exception: it hand-rolls a plain `<table>` with its own padding (`px-3 py-2`) because each cell holds a per-variant `<Input>` in a colour × size grid, which doesn't map cleanly onto the list-of-records shape the shared primitives assume. It's still semantically correct (proper `scope="row"` on the leading `<th>`, etc.), just visually and structurally the odd one out.

**How to apply**: if `InventoryGrid` is touched again, either migrate it onto the shared `Table` primitives (wrapping the per-cell `<Input>` inside `TableCell`) or leave a comment explaining why it opted out, so this doesn't get re-flagged as an unexplained regression in the next review. Not urgent — it doesn't cause data-misreading, just a style inconsistency on the highest-density screen.

See also [[admin-shared-component-gaps]] for the other systemic finding from the same audit (Field's missing aria-describedby wiring, and the missing unsaved-changes guard outside this same InventoryGrid component).
