import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Cache invalidation for storefront surfaces after an admin write.
 *
 * `revalidatePath` ONLY. `revalidateTag` needs a second argument in Next 16 and
 * nothing here is tagged; `unstable_cache` is not used anywhere in this app.
 *
 * ⚠️ For a DYNAMIC segment the `type` argument is MANDATORY:
 * `revalidatePath("/products/[slug]", "page")`. Omitting it does not error —
 * it silently matches nothing, and stale product pages stay served.
 */

/** Every surface that lists products. */
function revalidateProductLists() {
  revalidatePath("/products");
  // The home page renders featured products from the same table.
  revalidatePath("/");
}

/**
 * After creating or updating one product. Pass `previousSlug` when the slug
 * changed so the old URL stops serving the moved product.
 */
export function revalidateProduct(slug: string, previousSlug?: string | null) {
  revalidateProductLists();
  // A literal path — no `type` argument here, by design.
  revalidatePath(`/products/${slug}`);
  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`/products/${previousSlug}`);
  }
}

/**
 * After a delete or a reorder, where the affected slugs are not worth
 * enumerating: blow away every product page at once.
 */
export function revalidateAllProducts() {
  // "page" is REQUIRED — this is a dynamic segment, not a literal path.
  revalidatePath("/products/[slug]", "page");
  revalidateProductLists();
}
