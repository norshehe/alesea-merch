---
name: order-emails
description: Order email contract — after() + never throw, order_notifications claim ledger, ORDER_EMAILS_SEND arming, per-address throttle, no request echoes in buyer mail
metadata:
  type: project
---

Order emails (buyer confirmation, admin alert, buyer status updates) live in `src/features/notifications/{lib,server}/order-emails.ts`, on the shared `src/lib/email/shell.ts` (full-document shell, table rows, escapeHtml), which every email now uses.

**Why:** checkout is public and takes any address, so the reviewers treated it as an open relay (2026-10-10). That shaped the hardening: no customer text in subjects or opening lines, URL prefixes stripped from the address block, and at most 3 orders per address per hour get emails. `delivery_label` / `payment_method` are request echoes, so emails render `DELIVERY_LABELS[delivery_method]` and `PAYMENT_METHOD_COD` instead.

**How to apply:**
- Any new order email claims `(order_id, kind)` in `order_notifications` (migration 0013, service-role only) before sending, and releases the claim if the send fails.
- Schedule sends with `after()` and never throw into the action.
- Sends happen only when `ORDER_EMAILS_SEND === "true"`.
- Pass `transactional: true` to `sendEmail`.
- Adding a new `kind` means updating the table's CHECK constraint.

Related: [[server-authoritative-order-pricing]], [[orders-admin]].
