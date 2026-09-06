"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary for the storefront. Must be a client component —
 * React error boundaries only exist on the client.
 *
 * This is the other half of the "let fetch errors throw" contract in
 * `features/catalog/server/catalog.ts`: a failed Supabase read surfaces here as
 * a styled page inside the site chrome, rather than being swallowed into an
 * empty grid or a `notFound()` that ISR would then cache.
 */
export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[storefront] route error:", error);
  }, [error]);

  return (
    <section className="px-6 py-[120px] sm:px-14">
      <div className="mx-auto max-w-[520px] text-center">
        <span className="text-xs tracking-[0.32em] uppercase text-teal">
          Something went wrong
        </span>
        <h1 className="mt-3 font-serif text-[34px] leading-[1.08] text-balance text-teal sm:text-[42px]">
          The tide pulled this page out.
        </h1>
        <p className="mt-5 text-base leading-[1.7] font-normal text-stone-deep">
          We couldn&rsquo;t load this just now. Give it another go — it&rsquo;s
          usually back in a moment.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-[10.5px] tracking-[0.12em] uppercase text-stone">
            Ref {error.digest}
          </p>
        ) : null}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-teal bg-teal px-8 py-4 text-[12px] tracking-[0.18em] uppercase text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          >
            Try again
          </button>
          <Link
            href="/"
            className="text-[11.5px] tracking-[0.18em] uppercase text-teal underline-offset-8 transition-colors hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
          >
            Back to home →
          </Link>
        </div>
      </div>
    </section>
  );
}
