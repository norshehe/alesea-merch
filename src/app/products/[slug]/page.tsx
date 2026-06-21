import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCatalog,
  getProduct,
  getRelated,
} from "@/features/catalog/server/catalog";
import { ProductDetail } from "@/features/catalog/components/product-detail";
import { SizeGuide } from "@/features/catalog/components/size-guide";
import { formatPrice } from "@/lib/format";
import { getInventory } from "@/lib/airtable/inventory";
import { variantKey } from "@/features/catalog/lib/stock";

// Revalidate remote (Contentful) product data periodically so edits surface
// without a redeploy, while still prerendering pages statically.
export const revalidate = 60;

interface IProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: IProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Not found · Alesea" };
  return {
    title: `${product.name} · Alesea`,
    description: product.blurb,
  };
}

export async function generateStaticParams() {
  const catalog = await getCatalog();
  return catalog.map((product) => ({ slug: product.slug }));
}

const THUMBS = ["FRONT", "BACK", "DETAIL"];

export default async function ProductPage({ params }: IProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [catalog, inventory] = await Promise.all([
    getCatalog(),
    getInventory(),
  ]);
  const related = getRelated(product, catalog, 4);
  const [hero, ...gallery] = product.images;

  // Slice the inventory map to just this product's variants, as a plain
  // serializable record keyed by `slug|Color|Size` for the client component.
  const stock: Record<string, number> = {};
  for (const color of product.colors) {
    for (const size of product.sizes) {
      const key = variantKey(product.slug, color.name, size);
      const value = inventory.get(key);
      if (value !== undefined) stock[key] = value;
    }
  }

  return (
    <div className="px-6 pt-[34px] pb-24 sm:px-14">
      <Link
        href="/#shop-grid"
        className="mb-[30px] inline-block text-[11.5px] tracking-[0.16em] uppercase text-stone transition-colors hover:text-ink"
      >
        ← Back to shop
      </Link>

      <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-2">
        {/* gallery */}
        <div className="grid grid-cols-[74px_1fr] gap-[18px]">
          <div className="flex flex-col gap-3.5">
            {gallery.length > 0
              ? gallery.slice(0, 3).map((image) => (
                  <div
                    key={image.url}
                    className="relative aspect-4/5 overflow-hidden bg-sand"
                  >
                    <Image
                      src={image.url}
                      alt={image.alt}
                      fill
                      sizes="74px"
                      className="object-cover"
                    />
                  </div>
                ))
              : THUMBS.map((label) => (
                  <div
                    key={label}
                    className="dc-stripe flex aspect-4/5 items-center justify-center"
                  >
                    <span className="font-mono text-[8px] tracking-[0.1em] uppercase text-[#B6A988]">
                      {label}
                    </span>
                  </div>
                ))}
          </div>
          {hero ? (
            <div className="relative aspect-4/5 overflow-hidden bg-sand">
              <Image
                src={hero.url}
                alt={hero.alt}
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="dc-stripe relative flex aspect-4/5 flex-col items-center justify-center gap-3 px-[30px] text-center">
              <span className="font-serif text-[34px] text-[#C4B79C]">
                {product.name}
              </span>
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#B6A988]">
                {product.category.toUpperCase()} — drop product photo
              </span>
            </div>
          )}
        </div>

        {/* info */}
        <ProductDetail product={product} stock={stock} />
      </div>

      {/* size guide — apparel only */}
      {product.category === "tees" ? <SizeGuide /> : null}

      {/* related */}
      {related.length > 0 ? (
        <div className="mt-[88px]">
          <h3 className="mb-7 font-serif text-[28px] text-teal">
            Complete the set
          </h3>
          <div className="grid grid-cols-2 gap-[26px] lg:grid-cols-4">
            {related.map((r) => {
              const thumb = r.images[0];
              return (
                <Link
                  key={r.id}
                  href={`/products/${r.slug}`}
                  className="flex flex-col"
                >
                  {thumb ? (
                    <div className="relative aspect-4/5 overflow-hidden bg-sand">
                      <Image
                        src={thumb.url}
                        alt={thumb.alt}
                        fill
                        sizes="(min-width: 1024px) 22vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="dc-stripe flex aspect-4/5 items-center justify-center">
                      <span className="px-4 text-center font-serif text-[19px] text-[#C4B79C]">
                        {r.name}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-[5px] pt-3.5">
                    <span className="font-serif text-[17px] text-teal">
                      {r.name}
                    </span>
                    <span className="text-sm text-stone">
                      {formatPrice(r.price, r.currency)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
