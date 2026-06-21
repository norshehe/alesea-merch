---
name: pdp-size-guide
description: Apparel size guide table on the PDP — static constants now, structured for a future Contentful move; gated to tee products only.
metadata:
  type: project
---

The PDP renders an apparel "Size guide" table (Size/Length/Width/Sleeve) only for tee products.

**Why:** The measurements (length/width/sleeve in inches) only make sense for apparel; non-apparel categories (bags, caps, tumblers) must not show it.

**How to apply:**
- Gate on `product.category === "tees"` (the apparel key in `CatalogCategory`). Rendered full-width on the PDP page (`src/app/products/[slug]/page.tsx`) below the gallery+info grid, before the "Complete the set" related section — not inside the `ProductDetail` info column.
- Data lives in `src/features/catalog/constants/size-guide.ts` (`ISizeGuideRow`, `TEE_SIZE_GUIDE`, `SIZE_GUIDE_COLUMNS`). It is intentionally static + typed so it can move to Contentful later without changing the consuming component — mirrors the same "local catalog as fallback" stance noted in [[project_alesea-shop-storefront]].
- Component is `src/features/catalog/components/size-guide.tsx`, a pure server component (no interactivity). Brand styling: Playfair `font-serif text-teal` heading, `bg-teal text-white` header row, `bg-cream` first column, `border-line` dividers, rounded-xl container with `overflow-x-auto`. Uses brand tokens per [[brand-system]].
