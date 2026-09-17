import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Cache invalidation for storefront surfaces after an admin write.
 *
 * `revalidatePath` ONLY. `revalidateTag` needs a second argument in Next 16 and
 * nothing here is tagged; `unstable_cache` is not used anywhere in this app.
 */

/**
 * Every storefront surface built from `products`, `product_images` or
 * `inventory` — which, in practice, is every storefront surface.
 *
 * This replaces the old `revalidateProduct(slug)` / `revalidateAllProducts()`
 * pair. A per-slug invalidation looked cheaper but was WRONG: each product page
 * renders a "Complete the set" strip built from the whole catalogue and links
 * to it by slug, so a save that touched one product left every other product
 * page stale. After a rename those stale pages linked to a slug that had just
 * been revalidated into a 404 — a live broken link on every PDP, produced by an
 * edit that looked local.
 *
 * ⚠️ For a DYNAMIC segment the `type` argument is MANDATORY:
 * `revalidatePath("/products/[slug]", "page")`. Omitting it does not error — it
 * silently matches nothing, and stale product pages stay served.
 */
export function revalidateStorefrontProducts() {
  // "page" is REQUIRED — this is a dynamic segment, not a literal path.
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/products");
  // The home page renders featured products from the same table.
  revalidatePath("/");
}
