import type { Metadata } from "next";
import { getCatalog } from "@/features/catalog/server/catalog";
import { getInventory } from "@/features/catalog/server/inventory";
import { buildGridStock } from "@/features/catalog/lib/build-grid-stock";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import { CategoryFilter } from "@/features/catalog/components/category-filter";
import { CATEGORY_LABELS } from "@/features/catalog/constants/products";
import type { CatalogCategory } from "@/features/catalog/types";

// Same cadence as the home page: Contentful copy and Airtable stock surface
// within ~a minute without a redeploy, while the page still prerenders.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop all · Alesea",
  description:
    "Every piece in the Alesea collection — tees, bags and coastal goods, printed and shipped from La Union.",
};

interface IProductsPageProps {
  searchParams: Promise<{ category?: string }>;
}

function isCategory(value: string | undefined): value is CatalogCategory {
  return value !== undefined && value in CATEGORY_LABELS;
}

export default async function ProductsPage({
  searchParams,
}: IProductsPageProps) {
  const [{ category }, products, inventory] = await Promise.all([
    searchParams,
    getCatalog(),
    getInventory(),
  ]);

  const active = isCategory(category) ? category : undefined;

  // Categories present in the catalog, in first-seen order — an empty category
  // never gets a pill that leads to an empty grid.
  const categories = products.reduce<CatalogCategory[]>((acc, product) => {
    if (!acc.includes(product.category)) acc.push(product.category);
    return acc;
  }, []);

  const visible = active
    ? products.filter((product) => product.category === active)
    : products;

  // Stock is computed for the full catalog so the summary is stable regardless
  // of the active filter.
  const gridStock = buildGridStock(products, inventory);

  return (
    <div className="px-6 pt-[52px] sm:px-14">
      <header>
        <span className="text-xs tracking-[0.32em] uppercase text-teal">
          The Alesea Shop
        </span>
        <h1 className="mt-3 max-w-[620px] font-serif text-[38px] leading-[1.06] text-balance text-teal sm:text-[52px]">
          Everything in the collection
        </h1>
        <p className="mt-5 max-w-[460px] text-base leading-[1.7] font-normal text-stone-deep">
          Small-batch coastal goods — printed, packed and shipped from the
          shores of La Union.
        </p>
      </header>

      <div className="mt-10">
        <CategoryFilter
          categories={categories}
          active={active}
          basePath="/products"
        />
      </div>

      <ProductGrid
        id="all-products"
        products={visible}
        stock={gridStock}
        eyebrow={active ? CATEGORY_LABELS[active] : "All products"}
        heading={
          active
            ? `${CATEGORY_LABELS[active]} — ${visible.length} ${
                visible.length === 1 ? "piece" : "pieces"
              }`
            : `${visible.length} ${visible.length === 1 ? "piece" : "pieces"} to carry the coast home`
        }
        emptyTitle={
          active ? "Nothing here yet." : "Nothing in the collection yet."
        }
        emptyBody={
          active
            ? "Try another category — the rest of the collection is a tap away."
            : "Check back soon."
        }
      />
    </div>
  );
}
