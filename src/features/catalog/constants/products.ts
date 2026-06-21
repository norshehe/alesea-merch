import type { CatalogCategory, ICatalogProduct } from "../types";

/** Human labels for category keys. */
export const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  tees: "T-Shirts",
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
export const PRODUCTS: ICatalogProduct[] = [
  {
    id: "t1",
    slug: "baroro-sunrise-tee",
    category: "tees",
    name: "Baroro Sunrise Tee",
    price: 890,
    blurb:
      "A garment-dyed cotton tee carrying a sun-faded print of the long beach at Baroro. Relaxed, soft, made to be worn until it fades just right.",
    materials: "100% organic combed cotton, 180gsm. Garment dyed, pre-shrunk.",
    colors: [
      { name: "Sand", hex: "#E4D8BF" },
      { name: "Sea", hex: "#6E7E72" },
      { name: "Clay", hex: "#084F51" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    sizeLabel: "Size",
    currency: "PHP",
    images: [],
  },
  {
    id: "t2",
    slug: "surf-town-tee",
    category: "tees",
    name: "Surf Town Tee",
    price: 890,
    blurb:
      "A relaxed, boxy tee with a screen-printed surf-town graphic. The one you reach for after a morning in the water.",
    materials: "100% organic combed cotton, 180gsm. Water-based inks.",
    colors: [
      { name: "Off-White", hex: "#EFE7D6" },
      { name: "Ink", hex: "#2C2A26" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    sizeLabel: "Size",
    currency: "PHP",
    images: [],
  },
  {
    id: "b1",
    slug: "tammocalao-tote",
    category: "bags",
    name: "Tammocalao Tote",
    price: 1290,
    blurb:
      "A heavyweight canvas tote that swallows a whole beach day — towel, book, sunscreen, the lot. Webbed handles built to last.",
    materials: "16oz cotton canvas, cotton-webbed handles, interior pocket.",
    colors: [
      { name: "Natural", hex: "#E4D8BF" },
      { name: "Olive", hex: "#6E7E72" },
    ],
    sizes: ["One size"],
    sizeLabel: "Size",
    currency: "PHP",
    images: [],
  },
  {
    id: "b2",
    slug: "coastline-weekender",
    category: "bags",
    name: "Coastline Weekender",
    price: 2490,
    blurb:
      "A waxed-canvas duffel sized for villa-hopping down the coast. Leather trim that wears in beautifully.",
    materials: "Waxed cotton canvas, full-grain leather trim, brass hardware.",
    colors: [
      { name: "Sand", hex: "#DBCDAE" },
      { name: "Charcoal", hex: "#3A352E" },
    ],
    sizes: ["One size"],
    sizeLabel: "Size",
    currency: "PHP",
    images: [],
  },
  {
    id: "c1",
    slug: "sunset-cap",
    category: "caps",
    name: "Sunset Cap",
    price: 790,
    blurb:
      "A six-panel cap with a low, easy profile and the Alesea mark embroidered at the front. For long, bright afternoons.",
    materials: "Brushed cotton twill, adjustable metal-buckle strap.",
    colors: [
      { name: "Bone", hex: "#EFE7D6" },
      { name: "Terracotta", hex: "#084F51" },
      { name: "Navy", hex: "#2C3340" },
    ],
    sizes: ["One size"],
    sizeLabel: "Size",
    currency: "PHP",
    images: [],
  },
  {
    id: "c2",
    slug: "dune-bucket-hat",
    category: "caps",
    name: "Dune Bucket Hat",
    price: 850,
    blurb:
      "A reversible bucket hat for the hours when the sun is high and you are not coming in. Two looks in one.",
    materials: "Cotton twill, fully reversible, packable.",
    colors: [
      { name: "Natural", hex: "#E4D8BF" },
      { name: "Sea", hex: "#6E7E72" },
    ],
    sizes: ["S/M", "L/XL"],
    sizeLabel: "Fit",
    currency: "PHP",
    images: [],
  },
  {
    id: "u1",
    slug: "oeste-tumbler",
    category: "tumblers",
    name: "Oeste Tumbler",
    price: 990,
    blurb:
      "An insulated stainless tumbler that keeps a drink cold for 24 hours by the pool. Powder-coated, fits a cupholder.",
    materials:
      "18/8 stainless steel, double-wall vacuum, powder-coated finish.",
    colors: [
      { name: "Sand", hex: "#DBCDAE" },
      { name: "Sage", hex: "#6E7E72" },
    ],
    sizes: ["350ml", "500ml"],
    sizeLabel: "Size",
    currency: "PHP",
    images: [],
  },
  {
    id: "u2",
    slug: "morning-swell-bottle",
    category: "tumblers",
    name: "Morning Swell Bottle",
    price: 890,
    blurb:
      "An everyday stainless bottle that keeps pace from the surf to the sand and back. Leakproof, easy to carry.",
    materials: "Double-wall stainless steel, leakproof lid, BPA-free.",
    colors: [
      { name: "Bone", hex: "#EFE7D6" },
      { name: "Clay", hex: "#084F51" },
    ],
    sizes: ["500ml", "750ml"],
    sizeLabel: "Size",
    currency: "PHP",
    images: [],
  },
];

export function getProductBySlug(slug: string): ICatalogProduct | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getRelatedProducts(
  product: ICatalogProduct,
  limit = 4,
  pool: ICatalogProduct[] = PRODUCTS,
): ICatalogProduct[] {
  const related = pool.filter(
    (p) => p.id !== product.id && p.category !== product.category,
  );
  // Fallback: if cross-category yields nothing (tiny catalog), allow any other
  // product so "Complete the set" is never empty when others exist.
  const source =
    related.length > 0 ? related : pool.filter((p) => p.id !== product.id);
  return source.slice(0, limit);
}
