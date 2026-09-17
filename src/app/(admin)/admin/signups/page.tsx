import Link from "next/link";
import { Download, Mail, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/features/admin/components/empty-state";
import { PageHeader } from "@/features/admin/components/page-header";
import {
  FilterChip,
  PagerLink,
} from "@/features/admin/components/list-controls";
import { ListSearch } from "@/features/admin/components/list-search";
import {
  countSignups,
  listAdminSignups,
  parseSignupStatus,
  type SignupStatus,
} from "@/features/admin/signups/server/signup.queries";

/**
 * Signups are READ ONLY. There is no create, edit or delete on this screen:
 * these are customer records, and the only writers are the storefront signup
 * form and the back-in-stock cron job.
 *
 * The `notified_at` state is surfaced, never hidden. A row with no timestamp is
 * still owed its one back-in-stock email; a stamped row has had it and will
 * never be emailed again for that source. Collapsing the two would hide the
 * only fact an operator actually needs from this table.
 */

const DATE_FORMAT = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** Filter state lives entirely in the URL, so every view is linkable — and so
 *  the CSV export can read the same query string back. */
function signupsHref(
  params: { status?: SignupStatus | null; q?: string; page?: number },
  base = "/admin/signups",
): string {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

export default async function AdminSignupsPage({
  searchParams,
}: {
  // Next 16: `searchParams` is a Promise and MUST be awaited.
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { status: rawStatus, q: rawQuery, page: rawPage } = await searchParams;

  const status = parseSignupStatus(rawStatus);
  const query = rawQuery?.trim() ?? "";
  const parsedPage = Number(rawPage);
  const page =
    Number.isFinite(parsedPage) && parsedPage >= 1 ? Math.floor(parsedPage) : 1;

  const [counts, result] = await Promise.all([
    countSignups(),
    listAdminSignups({ status: status ?? undefined, q: query, page }),
  ]);

  const filtered = status !== null || query.length > 0;

  return (
    <>
      <PageHeader
        title="Signups"
        description="Back-in-stock captures from the storefront. Read-only — the signup form and the notification job are the only writers."
        actions={
          <Button
            variant="outline"
            // The export mirrors the current filters, so the button carries
            // them across. Base UI has no `asChild` — `render` is the escape
            // hatch, and a download must be a real link, not a button.
            render={
              <Link
                href={signupsHref(
                  { status, q: query },
                  "/api/admin/signups/export",
                )}
                prefetch={false}
              />
            }
          >
            <Download aria-hidden="true" />
            Export CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          <FilterChip
            href={signupsHref({ q: query })}
            label="All"
            count={counts.total}
            active={status === null}
          />
          <FilterChip
            href={signupsHref({ status: "pending", q: query })}
            label="Waiting"
            count={counts.pending}
            active={status === "pending"}
          />
          <FilterChip
            href={signupsHref({ status: "notified", q: query })}
            label="Notified"
            count={counts.notified}
            active={status === "notified"}
          />
        </div>
        <ListSearch
          basePath="/admin/signups"
          q={query}
          preserve={{ status }}
          placeholder="Email or source"
          label="Search signups by email or source"
        />
      </div>

      {/* Two different nothings: nobody has ever signed up, and a filter that
          matched nothing. Showing "No signups yet" to someone who just searched
          sends them looking for a bug that isn't there. */}
      {counts.total === 0 ? (
        <EmptyState
          icon={Mail}
          title="No signups yet"
          description="When someone asks to be told a product is back, their email lands here."
        />
      ) : result.signups.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No signups match"
          description="No signup matches this filter and search. Try a different status, or search by email or source."
          action={
            <Button variant="outline" render={<Link href="/admin/signups" />}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Signed up</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.signups.map((signup) => (
                  <TableRow key={signup.id}>
                    <TableCell className="font-medium">{signup.email}</TableCell>
                    <TableCell>
                      {/* Shown verbatim: `source` is a form-placement label, not
                          necessarily a product slug. The job matches it to the
                          longest slug it starts with, so naming a product here
                          would be a guess. */}
                      <code className="text-muted-foreground text-xs">
                        {signup.source}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {DATE_FORMAT.format(new Date(signup.createdAt))}
                    </TableCell>
                    <TableCell>
                      {signup.notifiedAt ? (
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary">
                            Notified{" "}
                            {DATE_FORMAT.format(new Date(signup.notifiedAt))}
                          </Badge>
                          {signup.notifiedFor ? (
                            <span className="text-muted-foreground text-xs">
                              about {signup.notifiedFor}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <Badge variant="outline">Waiting</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="text-muted-foreground mt-3 text-xs">
            A waiting signup gets exactly one back-in-stock email. Once it is
            marked notified it is never emailed again for that source — that is
            the promise made on the signup form.
          </p>

          {result.pageCount > 1 ? (
            <nav
              className="mt-4 flex items-center justify-between gap-3"
              aria-label="Signups pagination"
            >
              <p className="text-muted-foreground text-sm">
                Page {result.page} of {result.pageCount} · {result.total}{" "}
                {filtered ? "matching " : ""}
                {result.total === 1 ? "signup" : "signups"}
              </p>
              <div className="flex items-center gap-2">
                <PagerLink
                  href={signupsHref({ status, q: query, page: result.page - 1 })}
                  disabled={result.page <= 1}
                >
                  Previous
                </PagerLink>
                <PagerLink
                  href={signupsHref({ status, q: query, page: result.page + 1 })}
                  disabled={result.page >= result.pageCount}
                >
                  Next
                </PagerLink>
              </div>
            </nav>
          ) : null}
        </>
      )}
    </>
  );
}
