---
name: admin-write-contract
description: Non-obvious rules every /admin Server Action must follow — zero-row writes, image bytes, revalidation breadth — established by the 2026-09-06 pre-deploy review.
metadata:
  type: project
---

Four rules for anything written under `src/features/admin/**/server/*.actions.ts`.

**Why:** each one was a real defect found in the 2026-09-06 pre-deploy review, and each is invisible in normal testing — the failure only shows up under RLS denial, a mid-save error, or a rename.

**How to apply:**

1. **Every UPDATE/DELETE ends in `.select("id")` and treats an empty result as failure.** PostgREST returns no error when a write matches nothing, and an RLS-denied write *is* a zero-row write — so a delete refused by an expired session used to toast "deleted" and navigate away. Use `notWrittenMessage()` from `features/admin/server/action-result.ts`.
2. **Multi-write saves insert first, delete after.** There is no transaction across two PostgREST calls. Failing halfway must leave *extra* rows, never zero. The product-image write is the reference implementation; the create path rolls the parent row back so a retry doesn't hit the slug unique constraint forever.
3. **Storage bytes are deleted only by the server, only after the rows commit.** The browser must never call `storage.remove()` on form edit — an abandoned form then leaves a live page rendering a 404. The accepted cost is leaked objects for never-saved uploads; the answer is a periodic bucket sweep, not more code.
4. **Any product write revalidates the whole storefront** (`revalidateStorefrontProducts()`), never one slug. Each PDP renders a "Complete the set" strip built from the full catalogue, so a rename left every *other* PDP linking to a slug that had just been revalidated into a 404.

Related: [[orders-admin]], [[supabase-write-path-migration]].
