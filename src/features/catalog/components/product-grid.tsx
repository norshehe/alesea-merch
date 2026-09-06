import Link from "next/link";
import { ProductCard } from "@/features/catalog/components/product-card";
import type { ICatalogProduct } from "@/features/catalog/types";
import type { IGridStock } from "@/features/catalog/lib/build-grid-stock";

interface IProductGridProps {
  products: ICatalogProduct[];
  /** Per-product stock summary keyed by product id. Empty when Airtable is down. */
  stock?: IGridStock;
  /** Anchor id — the home page keeps `shop-grid` for its in-page CTAs. */
  id?: string;
  eyebrow?: string;
  heading?: string;
  /** Optional trailing link (e.g. "View all products" on the home page). */
  action?: { href: string; label: string };
  /** Copy for the zero-products state. */
  emptyTitle?: string;
  emptyBody?: string;
}

export function ProductGrid({
  products,
  stock,
  id = "shop-grid",
  eyebrow = "The Collection",
  heading = "Three ways to bring the beach home",
  action,
  emptyTitle = "Nothing in the collection yet.",
  emptyBody = "Check back soon.",
}: IProductGridProps) {
  return (
    <section id={id} className="px-6 pt-[84px] pb-24 sm:px-14">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs tracking-[0.32em] uppercase text-teal">
            {eyebrow}
          </span>
          <h2 className="mt-3 font-serif text-[34px] text-teal sm:text-[46px]">
            {heading}
          </h2>
        </div>
        {action ? (
          <Link
            href={action.href}
            className="text-[11.5px] tracking-[0.18em] uppercase text-teal underline-offset-8 transition-colors hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
          >
            {action.label} →
          </Link>
        ) : null}
      </div>

      {products.length === 0 ? (
        <div className="border-t border-line py-20 text-center">
          <p className="font-serif text-[22px] text-teal">{emptyTitle}</p>
          <p className="mt-2 text-sm font-normal text-stone">{emptyBody}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-[26px] gap-y-[30px] md:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              soldOut={stock?.[product.id]?.soldOut ?? false}
              soldOutSizes={stock?.[product.id]?.soldOutSizes ?? []}
            />
          ))}
        </div>
      )}
    </section>
  );
}
