import type { ICatalogProduct } from "@/features/catalog/types";
import { stockStatus, variantKey } from "@/features/catalog/lib/stock";

/**
 * Per-product stock summary for the grid/card. Serializable (plain record) so it
 * crosses the Server → Client component boundary as a prop.
 */
export type IGridStock = Record<
  string,
  {
    /** True when every variant of the product is out of stock. */
    soldOut: boolean;
    /**
     * Sizes that are out of stock in every colour. The card shows its size row
     * up-front, so it needs per-size availability to disable the dead options.
     */
    soldOutSizes: string[];
  }
>;

/**
 * Compute, for each product, whether EVERY variant is out of stock, plus which
 * individual sizes are out across all colours.
 *
 * Missing inventory keys mean "in stock" (see `stockStatus`), so a size is only
 * sold out when it has an explicit 0 in every colour. When the inventory map is
 * empty (Airtable down/absent), everything reads as in stock.
 */
export function buildGridStock(
  products: ICatalogProduct[],
  inventory: Map<string, number>,
): IGridStock {
  const result: IGridStock = {};

  for (const product of products) {
    const colors = product.colors.length > 0 ? product.colors : [{ name: "" }];
    const sizes = product.sizes.length > 0 ? product.sizes : [""];

    const soldOutSizes: string[] = [];

    for (const size of sizes) {
      const inStock = colors.some(
        (color) =>
          stockStatus(inventory.get(variantKey(product.slug, color.name, size))) !==
          "out",
      );
      if (!inStock) soldOutSizes.push(size);
    }

    result[product.id] = {
      // Every size sold out ⇒ the whole product is sold out.
      soldOut: soldOutSizes.length === sizes.length,
      soldOutSizes,
    };
  }

  return result;
}
