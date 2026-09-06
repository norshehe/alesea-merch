import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/features/admin/server/auth";
import {
  listAdminSignupsForExport,
  parseSignupStatus,
} from "@/features/admin/signups/server/signup.queries";

/**
 * CSV export of the signup list.
 *
 * A Route Handler rather than a Server Action because this returns a FILE: an
 * action can only return serialisable data, and the download needs real
 * `Content-Type` / `Content-Disposition` headers.
 *
 * ⚠️ IT MUST AUTHORISE ITSELF. `src/proxy.ts` only matches `/admin/:path*` and
 * `/login`, so nothing sits in front of `/api/*`. Without the check below, an
 * unauthenticated GET to this URL would download the entire customer email
 * list. RLS would also deny the read (there is no `anon` policy on `signups`),
 * but that would surface as an empty 200 CSV, not a refusal — so the check is
 * explicit and comes first.
 *
 * `getAdminUser()`, not `requireAdmin()`: a redirect to /login is the right
 * answer for a page and the wrong one for a download, which should fail loudly
 * as 401.
 */
export const dynamic = "force-dynamic";

/**
 * Leading characters that make a spreadsheet treat a cell as something other
 * than text.
 *
 * `= + - @` are the formula starters. Tab, CR and LF are here because Excel and
 * Sheets STRIP leading whitespace before parsing, so `\t=cmd|…` is read as
 * `=cmd|…` and the naive prefix check never fires. `|` starts a DDE payload
 * (`|cmd|'/c calc'!A0`), which is the same class of attack without an `=`.
 */
const FORMULA_TRIGGERS = new Set(["=", "+", "-", "@", "|", "\t", "\r", "\n"]);

/**
 * One CSV cell.
 *
 * Two separate hazards, both from user-supplied text (emails and source labels
 * both come off a public form):
 *
 * 1. Delimiters — every field is quoted and embedded quotes are doubled, so a
 *    comma, newline or quote cannot break out into a new column or row.
 * 2. CSV injection — Excel and Sheets execute a cell beginning `=`, `+`, `-` or
 *    `@` as a formula. A leading `'` neutralises it: the cell still reads as
 *    the original text, but nothing runs. Quoting alone does NOT prevent this.
 */
function toCell(value: string | null): string {
  const raw = value ?? "";
  const safe = FORMULA_TRIGGERS.has(raw.charAt(0)) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toRow(cells: (string | null)[]): string {
  return cells.map(toCell).join(",");
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // The same filters the page uses, read from the same query keys, so the
  // "Export CSV" button exports exactly the rows on screen.
  const { searchParams } = request.nextUrl;
  const status = parseSignupStatus(searchParams.get("status") ?? undefined);
  const q = searchParams.get("q")?.trim() ?? "";

  let signups;
  try {
    signups = await listAdminSignupsForExport({
      status: status ?? undefined,
      q,
    });
  } catch (error) {
    console.error("[admin-signups] export failed", error);
    return NextResponse.json({ error: "Could not export signups." }, { status: 500 });
  }

  const lines = [
    toRow(["email", "source", "signed_up_at", "notified_at", "notified_for"]),
    ...signups.map((signup) =>
      toRow([
        signup.email,
        signup.source,
        signup.createdAt,
        // Left blank, not "pending": a blank cell is what every spreadsheet
        // filter already understands as "no date".
        signup.notifiedAt,
        signup.notifiedFor,
      ]),
    ),
  ];

  // CRLF is what RFC 4180 specifies and what Excel expects.
  const csv = `${lines.join("\r\n")}\r\n`;
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="signups-${date}.csv"`,
      // This is customer PII — no shared cache, no browser cache, ever.
      "Cache-Control": "no-store",
    },
  });
}
