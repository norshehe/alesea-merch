# Back-in-stock notifications

Emails everyone who used a "Notify Me" form once the product they signed up for
has stock. Runs on a schedule, sends through SendGrid, and records the send on
the signup row in Postgres.

## How it decides who to email

State lives entirely on the `public.signups` row. A signup with a null
`notified_at` has never been emailed; stamping it is what prevents a second
send. There is no "last seen stock" bookkeeping — the promise made at signup is
"we'll tell you when it lands", which is exactly one email.

Each run:

1. reads the catalog, the `inventory` table and the pending `signups`
   (filtered server-side by `notified_at is null`, which hits a partial index);
2. groups them by product (`source` → product slug);
3. keeps the products whose stock is an **explicit** number greater than zero
   (unknown stock counts as in-stock everywhere else in the app, but here it
   would email customers about a product nobody has stocked yet);
4. stamps the row, then sends the email.

## Required data

The `public.signups` table (see `supabase/migrations/0004_signups.sql`):

| Column | Type | Written by |
| --- | --- | --- |
| `email` | text | the signup form |
| `source` | text | the signup form (e.g. `weekender-tote`, `weekender-tote-teaser`) |
| `notified_at` | timestamptz, null | this job |
| `notified_for` | text, null | this job |
| `created_at` | timestamptz | database default |

A unique index on `(lower(email), source)` makes re-signup a no-op, so a
customer who submits twice still receives exactly one email.

`source` is a form-placement label, not a slug. The job matches the longest
product slug that the source starts with, so `<slug>-<placement>` sources keep
working without a lookup table.

Stock comes from `public.inventory`, which is **sparse on purpose**: a variant
with no row has *unknown* stock. The storefront treats unknown as in-stock so a
sale is never blocked by missing data; this job does the opposite and requires
an explicit positive number, so nobody is emailed about a product that has never
actually been stocked.

Reads and writes use the **service-role** client: `signups` has no anon RLS
policy at all, so it is unreadable with the public key.

## Environment

```
SENDGRID_API_KEY=          # SendGrid API key with Mail Send permission
SENDGRID_FROM_EMAIL=       # MUST be a verified sender/domain in SendGrid
SENDGRID_FROM_NAME=Alesea Lifestyle
SENDGRID_REPLY_TO=         # optional
CRON_SECRET=               # shared secret; without it the route returns 503
SUPABASE_SERVICE_ROLE_KEY= # required — signups are not readable with the anon key
BACK_IN_STOCK_SEND=false   # "true" arms the job; anything else is a dry run
```

## Dry run (the default)

With `BACK_IN_STOCK_SEND` unset or not `"true"` the job reads everything,
reports which products are back in stock and who *would* be emailed, and touches
nothing — no email, no database write.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://<site>/api/cron/back-in-stock
```

```json
{ "dryRun": true, "products": [{ "slug": "weekender-tote", "recipients": 42 }],
  "sent": 0, "failed": 0, "skipped": [] }
```

Recipient addresses are logged (not returned in the response). Verify the
counts, then set `BACK_IN_STOCK_SEND=true` to go live.

## Schedule

`vercel.json` runs it once daily at 09:00 UTC (Vercel Hobby allows only daily
crons; on Pro, tighten to e.g. `*/15 * * * *`). Vercel Cron sends
`Authorization: Bearer $CRON_SECRET`; the same header works for a manual run.

## Failure behaviour

- **No `CRON_SECRET`** — 503. The endpoint stays shut rather than becoming a
  public "email all my customers" button.
- **No service-role key** — the run reports it and sends nothing.
- **First stamp fails** (RLS misconfigured, connection lost) — the run aborts
  before any email goes out. The column can no longer be missing, but the
  preflight guard is kept because it gives the same safety property.
- **Stamp succeeds, send fails** — the stamp is rolled back so the next run
  retries that recipient.
- **Crash between stamp and send** — that recipient is not emailed. Deliberate:
  under-sending beats double-sending.
- **One bad address** — logged, counted in `failed`, the queue continues.

## History

- **2026-09-06** — migrated from Airtable to Supabase Postgres. The Airtable
  `Signups` table was created that morning, one signup was captured and
  notified, and the row was imported with its `notified_at` stamp intact so the
  customer is not emailed twice.
