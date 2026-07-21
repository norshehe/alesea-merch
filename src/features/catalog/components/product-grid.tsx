import { ProductCard } from "@/features/catalog/components/product-card";
import type { ICatalogProduct } from "@/features/catalog/types";
import type { IGridStock } from "@/features/catalog/lib/build-grid-stock";

interface IProductGridProps {
  products: ICatalogProduct[];
  /** Per-product stock summary keyed by product id. Empty when Airtable is down. */
  stock?: IGridStock;
}

export function ProductGrid({ products, stock }: IProductGridProps) {
  return (
    <section id="shop-grid" className="px-6 pt-[84px] pb-24 sm:px-14">
      <div className="mb-10">
        <span className="text-xs tracking-[0.32em] uppercase text-teal">
          The Collection
        </span>
        <h2 className="mt-3 font-serif text-[34px] text-teal sm:text-[46px]">
          Three ways to bring the beach home
        </h2>
      </div>

      {products.length === 0 ? (
        <div className="border-t border-line py-20 text-center">
          <p className="font-serif text-[22px] text-teal">
            Nothing in the collection yet.
          </p>
          <p className="mt-2 text-sm font-light text-stone">
            Check back soon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-[26px] gap-y-[30px] md:grid-cols-3">
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
