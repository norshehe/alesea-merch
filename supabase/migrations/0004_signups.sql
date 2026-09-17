-- "Notify Me" email captures, and the back-in-stock job's state.
--
-- State lives entirely on the row: a signup with no `notified_at` has never been
-- emailed, and stamping it is what prevents a second send. There is no
-- "last seen stock" bookkeeping — the promise made at signup is "we'll tell you
-- when it lands", which is exactly one email.

create table public.signups (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  -- A form-placement label, not a slug (e.g. "weekender-tote-teaser"). The job
  -- resolves it to a product by longest-prefix match.
  source       text not null,
  notified_at  timestamptz,
  notified_for text,
  -- Airtable stamped this automatically; here the default does it, so the
  -- capture action still does not need to send it.
  created_at   timestamptz not null default now()
);

-- Makes re-signup idempotent (`on conflict do nothing`), matching the UX the
-- form already implies. Note this changes one edge case: a customer signing up
-- twice for the same source previously created a second un-notified row and
-- would have been emailed twice.
create unique index signups_email_source_key on public.signups (lower(email), source);

-- What the cron job scans. Keeps the run O(pending) rather than O(all signups).
create index signups_pending_idx on public.signups (source) where notified_at is null;
