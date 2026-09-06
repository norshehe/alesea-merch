# Back-in-stock notifications

Emails everyone who used a "Notify Me" form once the product they signed up for
has stock. Runs on a schedule, sends through SendGrid, and records the send on
the Airtable signup row.

## How it decides who to email

State lives entirely on the Airtable **Signups** row. A signup with an empty
`Notified At` has never been emailed; stamping it is what prevents a second
send. There is no "last seen stock" bookkeeping — the promise made at signup is
"we'll tell you when it lands", which is exactly one email.

Each run:

1. reads the catalog, the Airtable `Inventory` table and the `Signups` table;
2. groups signups with no `Notified At` by product (`Source` → product slug);
3. keeps the products whose stock is an **explicit** number greater than zero
   (unknown stock counts as in-stock everywhere else in the app, but here it
   would email customers about a product nobody has stocked yet);
4. stamps the row, then sends the email.

## Required Airtable setup

The base needs a **`Signups`** table (created 2026-09-06, id `tblbSi26de2xQWanV`).
Fields:

| Field | Type | Written by |
| --- | --- | --- |
| `Email` | Single line text | the signup form |
| `Source` | Single line text | the signup form (e.g. `weekender-tote`, `weekender-tote-teaser`) |
| `Notified At` | Single line text or Date | this job |
| `Notified For` | Single line text | this job |

`Source` is a form-placement label, not a slug. The job matches the longest
product slug that the source starts with, so `<slug>-<placement>` sources keep
working without a lookup table.

## Environment

```
SENDGRID_API_KEY=          # SendGrid API key with Mail Send permission
SENDGRID_FROM_EMAIL=       # MUST be a verified sender/domain in SendGrid
SENDGRID_FROM_NAME=Alesea Lifestyle
SENDGRID_REPLY_TO=         # optional
CRON_SECRET=               # shared secret; without it the route returns 503
BACK_IN_STOCK_SEND=false   # "true" arms the job; anything else is a dry run
```

## Dry run (the default)

With `BACK_IN_STOCK_SEND` unset or not `"true"` the job reads everything,
reports which products are back in stock and who *would* be emailed, and touches
nothing — no email, no Airtable write.

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
- **Missing `Notified At` column** — the first stamp of a run fails, the run
  aborts and *nothing* is emailed.
- **Stamp succeeds, send fails** — the stamp is rolled back so the next run
  retries that recipient.
- **Crash between stamp and send** — that recipient is not emailed. Deliberate:
  under-sending beats double-sending.
- **One bad address** — logged, counted in `failed`, the queue continues.

## Known gap

~~The `Signups` table is absent from the Airtable base.~~ **Resolved
2026-09-06** — the table was created with the fields above (`Email` is an
Airtable email field; the rest are single line text). "Notify Me" submissions
now persist. Remaining setup before arming the job: the SendGrid env vars and
`CRON_SECRET` in Vercel, then `BACK_IN_STOCK_SEND=true` after a clean dry run.
