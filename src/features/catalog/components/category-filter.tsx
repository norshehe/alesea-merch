import Link from "next/link";
import { CATEGORY_LABELS } from "@/features/catalog/constants/products";
import type { CatalogCategory } from "@/features/catalog/types";

interface ICategoryFilterProps {
  /** Categories actually present in the catalog, in catalog order. */
  categories: CatalogCategory[];
  /** Currently selected category, or undefined for "All". */
  active?: CatalogCategory;
  /** Route the pills link to (category is passed as `?category=`). */
  basePath: string;
}

const PILL =
  "rounded-full border px-5 py-2.5 text-[11px] tracking-[0.18em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal";

/**
 * Server-rendered category pills. Filtering is a plain navigation
 * (`/products?category=tees`) so the listing stays a Server Component and the
 * selection is shareable / back-button friendly.
 */
export function CategoryFilter({
  categories,
  active,
  basePath,
}: ICategoryFilterProps) {
  if (categories.length < 2) return null;

  const options: { key?: CatalogCategory; label: string; href: string }[] = [
    { label: "All", href: basePath },
    ...categories.map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      href: `${basePath}?category=${key}`,
    })),
  ];

  return (
    <nav aria-label="Filter by category" className="mb-10 flex flex-wrap gap-2.5">
      {options.map((option) => {
        const isActive = option.key === active;
        return (
          <Link
            key={option.label}
            href={option.href}
            aria-current={isActive ? "page" : undefined}
            className={`${PILL} ${
              isActive
                ? "border-teal bg-teal text-white"
                : "border-line bg-transparent text-stone-deep hover:border-teal hover:text-teal"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
