"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface IListSearchProps {
  /** Where a search lands, e.g. `/admin/orders`. */
  basePath: string;
  /** Current term, so the box survives a refresh and a back navigation. */
  q: string;
  /**
   * Filters to preserve alongside the term, so a search narrows the chosen chip
   * rather than resetting it. Empty and null values are dropped.
   */
  preserve?: Record<string, string | null | undefined>;
  placeholder: string;
  /** The accessible name of the box — say what is searched and by what. */
  label: string;
}

/**
 * Search box for a server-paginated admin list.
 *
 * Submits a NAVIGATION rather than filtering in the browser: these lists are
 * paginated server-side, so the URL is the only place the query can live and
 * still be correct on page 2 — and on `/admin/signups` it is also what the CSV
 * export reads to mirror the current view.
 *
 * `order-search.tsx` and `signup-search.tsx` were byte-identical apart from
 * their two labels and their path; this is that component with those three
 * things as props.
 */
export function ListSearch({
  basePath,
  q,
  preserve,
  placeholder,
  label,
}: IListSearchProps) {
  const router = useRouter();
  const [term, setTerm] = useState(q);

  function go(next: string) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(preserve ?? {})) {
      if (value) params.set(key, value);
    }
    if (next.trim()) params.set("q", next.trim());
    // `page` is intentionally dropped — a new query starts at page 1.
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        go(term);
      }}
    >
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className="w-64 pl-8"
        />
      </div>
      <Button type="submit" variant="outline" size="sm">
        Search
      </Button>
      {q ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setTerm("");
            go("");
          }}
        >
          <X aria-hidden="true" />
          Clear
        </Button>
      ) : null}
    </form>
  );
}
