import { Hero } from "@/features/catalog/components/home/hero";
import { Assurances } from "@/features/catalog/components/home/assurances";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import { EditorialSplit } from "@/features/catalog/components/home/editorial-split";
import { CarryFeature } from "@/features/catalog/components/home/carry-feature";
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

  const tees = products.filter((p) => p.category === "tees");

  return (
    <>
      <Hero content={content} />
      <Assurances content={content} />
      <ProductGrid products={products} stock={gridStock} />
      <EditorialSplit content={content} tees={tees} />
      <CarryFeature content={content} />
    </>
  );
}
