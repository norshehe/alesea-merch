"use client";

import { useState } from "react";
import { ProductCard } from "@/features/catalog/components/product-card";
import { CATEGORY_LABELS } from "@/features/catalog/constants/products";
import type { CatalogCategory, ICatalogProduct } from "@/features/catalog/types";
import type { IGridStock } from "@/features/catalog/lib/build-grid-stock";

type FilterKey = "all" | CatalogCategory;

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as CatalogCategory[];
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  ...CATEGORY_KEYS.map((key) => ({ key, label: CATEGORY_LABELS[key] })),
];

interface IProductGridProps {
  products: ICatalogProduct[];
  /** Per-product stock summary keyed by product id. Empty when Airtable is down. */
  stock?: IGridStock;
}

export function ProductGrid({ products: all, stock }: IProductGridProps) {
  const [active, setActive] = useState<FilterKey>("all");

  const products =
    active === "all" ? all : all.filter((p) => p.category === active);

  return (
    <section id="shop-grid" className="px-6 pt-[84px] pb-24 sm:px-14">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="text-xs tracking-[0.32em] uppercase text-teal">
            The Collection
          </span>
          <h2 className="mt-3 font-serif text-[34px] text-teal sm:text-[46px]">
            Everyday coastal goods
          </h2>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {FILTERS.map((filter) => {
            const on = active === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActive(filter.key)}
                aria-pressed={on}
                className={`border px-[18px] py-2.5 text-[11px] tracking-[0.14em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                  on
                    ? "border-teal bg-teal text-white"
                    : "border-line-deep bg-transparent text-stone hover:border-teal hover:text-teal"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="border-t border-line py-20 text-center">
          <p className="font-serif text-[22px] text-teal">
            Nothing in this collection yet.
          </p>
          <p className="mt-2 text-sm font-light text-stone">
            Try another category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-[26px] gap-y-[30px] md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              soldOut={stock?.[product.id]?.soldOut ?? false}
            />
          ))}
        </div>
      )}
    </section>
  );
}
