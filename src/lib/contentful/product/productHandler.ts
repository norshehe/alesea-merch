import { useQuery } from "@tanstack/react-query";
import {
  getProductBySlugFromContentful,
  getProductsFromContentful,
} from "./productClient";

/**
 * React Query hooks wrapping the product client.
 * Components consume these — never call the client directly from a component.
 * Note: the storefront pages fetch products in Server Components via
 * `@/features/catalog/server/catalog`; these hooks exist for client-side needs.
 */

export const productKeys = {
  all: ["products"] as const,
  list: () => [...productKeys.all, "list"] as const,
  detail: (slug: string) => [...productKeys.all, "detail", slug] as const,
};

export function useGetProducts() {
  return useQuery({
    queryKey: productKeys.list(),
    queryFn: () => getProductsFromContentful(),
  });
}

export function useGetProduct(slug: string) {
  return useQuery({
    queryKey: productKeys.detail(slug),
    queryFn: () => getProductBySlugFromContentful(slug),
    enabled: Boolean(slug),
  });
}
