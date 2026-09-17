import Link from "next/link";

/**
 * Storefront 404 — a mistyped URL, or a product that was unpublished after the
 * link was shared. Both are ordinary customer paths, so this renders inside the
 * site chrome in the same voice as `error.tsx` rather than falling through to
 * Next's stock black-and-white page.
 *
 * A Server Component: unlike the error boundary there is nothing to retry and
 * no client state, so the only thing on offer is a way back into the shop.
 */
export default function StorefrontNotFound() {
  return (
    <section className="px-6 py-[120px] sm:px-14">
      <div className="mx-auto max-w-[520px] text-center">
        <span className="text-xs tracking-[0.32em] uppercase text-teal">
          Not found
        </span>
        <h1 className="mt-3 font-serif text-[34px] leading-[1.08] text-balance text-teal sm:text-[42px]">
          This one drifted off.
        </h1>
        <p className="mt-5 text-base leading-[1.7] font-normal text-stone-deep">
          The page you&rsquo;re after has moved or sold out. The rest of the
          collection is still here.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/products"
            className="rounded-full border border-teal bg-teal px-8 py-4 text-[12px] tracking-[0.18em] uppercase text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          >
            Shop the collection
          </Link>
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
