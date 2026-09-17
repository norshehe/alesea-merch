---
name: admin-route-handler-auth
description: Admin Route Handlers under /api are NOT covered by proxy.ts and must call getAdminUser() themselves and return 401.
metadata:
  type: project
---

Any admin-only Route Handler (e.g. `/api/admin/signups/export`) must start with
`await getAdminUser()` from `@/features/admin/server/auth` and return a 401 JSON
response when it is null — never `requireAdmin()` (a redirect is wrong for a
download) and never `redirect()`.

**Why:** `src/proxy.ts`'s matcher is `["/admin/:path*", "/login"]` only, so
nothing gates `/api/*`. RLS would still deny the read, but that surfaces as an
empty 200 body rather than a refusal — for the signups export that would look
like "the list is empty" instead of "you are not allowed".

**How to apply:** whenever adding a Route Handler that reads admin data or
returns a file (CSV/PDF exports are the common case, since Server Actions
cannot return files). Pair it with `Cache-Control: no-store` when the payload is
customer PII. Related: [[admin-route-group]].
