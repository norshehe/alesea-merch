import type { CatalogCategory, ICatalogProduct } from "../types";

/** Slug of the coming-soon Weekender Tote — referenced by footer + cards. */
export const WEEKENDER_TOTE_SLUG = "weekender-tote";

/** Human labels for category keys. */
export const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  tees: "Tees",
  bags: "Bags",
  caps: "Caps",
  tumblers: "Tumblers",
};

/** Free-shipping threshold (PHP), matching the design's default. */
export const FREE_SHIP_THRESHOLD = 2500;

/** Standard / express shipping costs (PHP). */
export const SHIPPING = {
  standard: 150,
  express: 280,
} as const;

/**
 * Local catalog. Source content from the Alesea Shop design handoff.
 * Replace with Contentful (`contentful-domain-scaffolder`) once a `product`
 * content type exists in the space.
 */
const TEE_MATERIALS =
  "230 GSM premium cotton blend. Ribbed collar holds its shape, wash after wash. Deep dye, no fading under summer sun.";

export const PRODUCTS: ICatalogProduct[] = [
  {
    id: "t1",
    slug: "weekender-tee",
    category: "tees",
    name: "Alesea Weekender Tee",
    price: 1100,
    blurb:
      "A sun-warmed tee that goes best with a fresh tan. Oversized, relaxed fit, Alesea Weekender script on the chest, and on the back, a collector's stamp of everything a good Alesea weekend is made of. Morning coffee, open water, irresistible beddings, no plans.",
    materials: TEE_MATERIALS,
    colors: [{ name: "Beige", hex: "#D9CBB2" }],
    sizes: ["S", "M", "L", "XL", "2XL"],
    sizeLabel: "Size",
    currency: "PHP",
    images: [],
  },
  {
    id: "t2",
    slug: "palm-tee",
    category: "tees",
    name: "Alesea Palm Tee",
    price: 1100,
    blurb:
      "Clean and simple, ready for sand and city. Oversized, relaxed fit, palm graphic on the left chest. Flip it and you get the full story: a collector's stamp of your favorite Alesea escape. Wear it on the drive down. Wear it on the way back. Probably wear it the week after too.",
    materials: TEE_MATERIALS,
    colors: [{ name: "White", hex: "#F5F5F0" }],
    sizes: ["S", "M", "L", "XL", "2XL"],
    sizeLabel: "Size",
    currency: "PHP",
    images: [],
  },
  {
    id: "b1",
    slug: "weekender-tote",
    category: "bags",
    name: "Alesea Weekender Tote",
    price: 0,
    comingSoon: true,
    blurb:
      "The Weekender Tote is on its way. Sign up and we'll let you know the moment it lands.",
    materials: "",
    colors: [],
    sizes: [],
    sizeLabel: "Size",
    currency: "PHP",
    images: [],
  },
];

export function getProductBySlug(slug: string): ICatalogProduct | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

/**
 * Related products for "Complete the set". With the trimmed catalog the useful
 * pairing for a tee is the other tee plus the Tote, so we simply surface every
 * other product in the pool (order preserved). Kept generic so it still works
 * if the catalog grows.
 */
export function getRelatedProducts(
  product: ICatalogProduct,
  limit = 4,
  pool: ICatalogProduct[] = PRODUCTS,
): ICatalogProduct[] {
  return pool.filter((p) => p.id !== product.id).slice(0, limit);
}
