import type { ICatalogProduct } from "@/features/catalog/types";
import { stockStatus, variantKey } from "@/features/catalog/lib/stock";

/**
 * Per-product stock summary for the grid/card. Serializable (plain record) so it
 * crosses the Server → Client component boundary as a prop.
 */
export type IGridStock = Record<string, { soldOut: boolean }>;

/**
 * Compute, for each product, whether EVERY variant is out of stock.
 *
 * Missing inventory keys mean "in stock" (see `stockStatus`), so a product is
 * only `soldOut` when it has variants AND all of them are an explicit 0. When the
 * inventory map is empty (Airtable down/absent), every product is in stock.
 */
export function buildGridStock(
  products: ICatalogProduct[],
  inventory: Map<string, number>,
): IGridStock {
  const result: IGridStock = {};

  for (const product of products) {
    const colors = product.colors.length > 0 ? product.colors : [{ name: "" }];
    const sizes = product.sizes.length > 0 ? product.sizes : [""];

    let anyInStock = false;
    for (const color of colors) {
      for (const size of sizes) {
        const key = variantKey(product.slug, color.name, size);
        if (stockStatus(inventory.get(key)) !== "out") {
          anyInStock = true;
          break;
        }
      }
      if (anyInStock) break;
    }

    result[product.id] = { soldOut: !anyInStock };
  }

  return result;
}
