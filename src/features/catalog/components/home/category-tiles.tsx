import Image from "next/image";
import Link from "next/link";
import type { IHomeContent } from "@/features/catalog/server/home";
import type { IShopCategory } from "@/lib/supabase/types/shopCategory/response";

interface ICategoryTilesProps {
  content: IHomeContent;
}

/**
 * Where a category tile points. `all` is a real filter key in the database but
 * means "no filter" on the listing page, so it links to the bare route rather
 * than `?category=all` (which `ProductsPage` would ignore anyway, leaving a
 * pill-less URL that looks filtered but isn't).
 */
function categoryHref(filterKey: IShopCategory["filterKey"]): string {
  return filterKey === "all" ? "/products" : `/products?category=${filterKey}`;
}

/**
 * "Shop by category" strip — three routes into the catalog, sitting between the
 * hero assurances and the product grid.
 *
 * Server component: purely presentational, no interactivity. Renders nothing
 * when no categories are active, so an emptied table collapses the section
 * instead of leaving a heading over blank space.
 */
export function CategoryTiles({ content }: ICategoryTilesProps) {
  if (content.categories.length === 0) return null;

  return (
    <section className="px-6 pt-[84px] sm:px-14">
      <div className="mb-10 max-w-[560px]">
        <span className="text-xs tracking-[0.32em] uppercase text-teal">
          {content.categoryEyebrow}
        </span>
        <h2 className="mt-3 font-serif text-[34px] leading-[1.06] text-balance text-teal sm:text-[46px]">
          {content.categoryHeading}
        </h2>
        <p className="mt-5 text-base leading-[1.7] font-normal text-stone-deep">
          {content.categoryBody}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-x-[26px] gap-y-[30px] sm:grid-cols-3">
        {content.categories.map((category) => (
          <Link
            key={category.id}
            href={categoryHref(category.filterKey)}
            className="group flex flex-col rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
          >
            <div className="dc-stripe relative aspect-4/5 overflow-hidden">
              {category.image ? (
                <Image
                  src={category.image}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-5 text-center">
                  <span className="font-serif text-[22px] leading-tight text-[#C4B79C]">
                    {category.label}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-[7px] pt-4">
              <span className="text-[10.5px] tracking-[0.2em] uppercase text-clay">
                {category.eyebrow}
              </span>
              <span className="font-serif text-[19px] text-teal underline-offset-4 group-hover:underline">
                {category.label}
              </span>
              <span className="mt-0.5 text-[11.5px] tracking-[0.18em] uppercase text-stone transition-colors group-hover:text-ink">
                Shop {category.label.toLowerCase()} →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
