"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OrderStatus } from "@/features/admin/orders/schemas/order.schema";

interface IOrderSearchProps {
  /** Current term, so the box survives a refresh and a back navigation. */
  q: string;
  /** Kept when searching, so a search narrows the chosen chip rather than resetting it. */
  status: OrderStatus | null;
}

/**
 * Reference / email search. Submits a navigation rather than filtering in the
 * browser: the list is paginated server-side, so the URL is the only place the
 * query can live and still be correct on page 2.
 */
export function OrderSearch({ q, status }: IOrderSearchProps) {
  const router = useRouter();
  const [term, setTerm] = useState(q);

  function go(next: string) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (next.trim()) params.set("q", next.trim());
    // `page` is intentionally dropped — a new query starts at page 1.
    const query = params.toString();
    router.push(query ? `/admin/orders?${query}` : "/admin/orders");
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
          placeholder="Reference or email"
          aria-label="Search orders by reference or email"
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
