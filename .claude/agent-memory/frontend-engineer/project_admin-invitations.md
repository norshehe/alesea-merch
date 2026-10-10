---
name: admin-invitations
description: How admin invites work (0011) — no token URLs; auth user created at code-request time, admin row granted at OTP verify; service-role-only SQL guards.
metadata:
  type: project
---

Admin invitations (added 2026-10-10, migration 0011) never put a token or session-minting URL in an email: the invite mail links to bare `/login`, and the invitee signs in with a typed OTP.

**Why:** Microsoft Safe Links prefetches URLs and burns single-use grants (see [[safe-links-breaks-magic-link-login]]); `inviteUserByEmail`/`generateLink` are banned for the same reason. All admins are equal (no roles) — user decision.

**How to apply:**
- `sendSignInCode` keeps `shouldCreateUser: false`; `provisionInvitedUser` pre-creates the auth user (`email_confirm: true`, so Supabase sends the code template, not "Confirm signup") only for an open, unexpired invite. Response must stay identical (non-oracle).
- `verifyAdminOtp` calls `accept_admin_invitation` after a successful verify; failure is silent (user lands on /not-authorized, which retries the accept once and redirects to /admin on success). Accept requires `email_confirmed_at` (0012).
- `sendSignInCode` surfaces only `over_request_rate_limit` (per-IP); the per-email 429 only fires for existing users, so showing it would be an oracle.
- Last-admin guard lives in `remove_admin_user` under a table lock; self-guard is in the action against the session id. Never trust a client "self" id.
- Invite/admin writes go through service role after `requireAdmin()` — `admin_invitations` has no write policies, so `requireAdmin()` is the only gate there.
- Related: [[admin-route-handler-auth]], [[admin-write-contract]].
