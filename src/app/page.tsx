import { Hero } from "@/features/catalog/components/home/hero";
import { ShopByCategory } from "@/features/catalog/components/home/shop-by-category";
import { Assurances } from "@/features/catalog/components/home/assurances";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import { EditorialSplit } from "@/features/catalog/components/home/editorial-split";
import { CarryFeature } from "@/features/catalog/components/home/carry-feature";
import { ShorelineGrid } from "@/features/catalog/components/home/shoreline-grid";
import { getHomeContent } from "@/features/catalog/server/home";
import { getCatalog } from "@/features/catalog/server/catalog";
import { getInventory } from "@/lib/airtable/inventory";
import { buildGridStock } from "@/features/catalog/lib/build-grid-stock";

// Revalidate Contentful-backed content periodically so edits surface without a
// redeploy, while still prerendering statically. Inventory is read here too, so
// Airtable stock edits surface within ~a minute.
export const revalidate = 60;

export default async function HomePage() {
  const [content, products, inventory] = await Promise.all([
    getHomeContent(),
    getCatalog(),
    getInventory(),
  ]);

  const gridStock = buildGridStock(products, inventory);

  return (
    <>
      <Hero content={content} />
      <ShopByCategory content={content} />
      <Assurances content={content} />
      <ProductGrid products={products} stock={gridStock} />
      <EditorialSplit content={content} />
      <CarryFeature content={content} />
      <ShorelineGrid content={content} />
    </>
  );
}
