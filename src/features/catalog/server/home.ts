import "server-only";
import {
  getHomeContentFromContentful,
  type IAssurance,
  type IHomeContent,
} from "@/lib/contentful/home/homeClient";
import type { IShopCategory } from "@/lib/contentful/types/shopCategory/response";

/**
 * Hardcoded homepage defaults, mirroring the original design copy and imagery.
 * Used per-field when Contentful is unreachable or a field is empty, so the
 * home page renders identically to before the data-source swap.
 */
const HOME_FALLBACK: IHomeContent = {
  heroEyebrow: "The Alesea Shop · La Union",
  heroHeading: "Carry the coast home.",
  heroBody:
    "Tees, bags, caps and tumblers made for slow mornings and long days by the water. A little piece of the villa, wherever you go.",
  heroImage:
    "https://lirp.cdn-website.com/a93d3aad/dms3rep/multi/opt/Pool+View-2280w.jpg",
  heroPrimaryCta: "Shop the collection",
  heroSecondaryCta: "Lookbook",
  categoryEyebrow: "Shop by category",
  categoryHeading: "Three ways to bring the beach home.",
  categoryBody:
    "Everything is small-batch and built for the coast — printed, packed and shipped from the shores of La Union.",
  categories: [
    { id: "fallback-apparel", label: "Apparel", eyebrow: "Collection", filterKey: "tees", image: null },
    { id: "fallback-bags", label: "Bags", eyebrow: "Collection", filterKey: "bags", image: null },
    { id: "fallback-accessories", label: "Accessories", eyebrow: "Collection", filterKey: "accessories", image: null },
  ],
  assurances: [
    {
      title: "Built for movement",
      body: "Performance-cotton blends that flex with you from warm-up to wind-down.",
    },
    {
      title: "Conscious fabrics",
      body: "Organic and water-resistant materials chosen to last more than a season.",
    },
    {
      title: "Fast island shipping",
      body: "Packed and dispatched quickly so your kit is ready when you are.",
    },
    {
      title: "Wear-it-in guarantee",
      body: "If it doesn’t move the way you do, send it back — no fuss.",
    },
  ],
  editorialEyebrow: "Made for the morning swim",
  editorialHeading: "Designed at the villa. Worn down the coast.",
  editorialBody:
    "Each piece is drawn from a place we love — the long beach at Baroro, the two pools at Tammocalao, the surf town mornings. Natural fabrics, muted dyes, built to be lived in.",
  editorialQuote:
    "“A place — and now a wardrobe — you can return to with confidence.”",
  editorialImage:
    "https://lirp.cdn-website.com/a93d3aad/dms3rep/multi/opt/Bath+Amenities-909h.jpg",
  editorialCta: "Shop everything",
  carryEyebrow: "Alesea Carry",
  carryHeading: "Everything but the tide.",
  carryBody:
    "From market runs to island hops, the Carry line holds the whole day. Water-resistant canvas, wipe-clean linings, and straps built for the boat — so you can pack light and stay long.",
  carryImage: null,
  carryCta: "Shop Alesea Carry",
  shorelineHandle: "@aleseacollection",
  shorelineHeading: "Spotted on the shoreline.",
  shorelineBody:
    "Tag us to be featured. Real guests, real goods, real golden hour.",
};

function str(value: string, fallback: string): string {
  return value.trim().length > 0 ? value : fallback;
}

function categories(
  value: IShopCategory[],
  fallback: IShopCategory[],
): IShopCategory[] {
  return value.length > 0 ? value : fallback;
}

function assurances(value: IAssurance[], fallback: IAssurance[]): IAssurance[] {
  return value.length > 0 ? value : fallback;
}

/**
 * Fully-typed homepage content for Server Components. Contentful first, with
 * per-field fallback to the original design copy. Image fields keep the
 * Contentful URL when present, else the original CDN image (or null).
 */
export async function getHomeContent(): Promise<IHomeContent> {
  let remote: IHomeContent | null = null;
  try {
    remote = await getHomeContentFromContentful();
  } catch (error) {
    console.warn(
      "[home] Contentful homePage fetch failed — using design defaults.",
      error,
    );
  }
  if (!remote) return HOME_FALLBACK;

  return {
    heroEyebrow: str(remote.heroEyebrow, HOME_FALLBACK.heroEyebrow),
    heroHeading: str(remote.heroHeading, HOME_FALLBACK.heroHeading),
    heroBody: str(remote.heroBody, HOME_FALLBACK.heroBody),
    heroImage: remote.heroImage ?? HOME_FALLBACK.heroImage,
    heroPrimaryCta: str(remote.heroPrimaryCta, HOME_FALLBACK.heroPrimaryCta),
    heroSecondaryCta: str(
      remote.heroSecondaryCta,
      HOME_FALLBACK.heroSecondaryCta,
    ),
    categoryEyebrow: str(remote.categoryEyebrow, HOME_FALLBACK.categoryEyebrow),
    categoryHeading: str(remote.categoryHeading, HOME_FALLBACK.categoryHeading),
    categoryBody: str(remote.categoryBody, HOME_FALLBACK.categoryBody),
    categories: categories(remote.categories, HOME_FALLBACK.categories),
    assurances: assurances(remote.assurances, HOME_FALLBACK.assurances),
    editorialEyebrow: str(
      remote.editorialEyebrow,
      HOME_FALLBACK.editorialEyebrow,
    ),
    editorialHeading: str(
      remote.editorialHeading,
      HOME_FALLBACK.editorialHeading,
    ),
    editorialBody: str(remote.editorialBody, HOME_FALLBACK.editorialBody),
    editorialQuote: str(remote.editorialQuote, HOME_FALLBACK.editorialQuote),
    editorialImage: remote.editorialImage ?? HOME_FALLBACK.editorialImage,
    editorialCta: str(remote.editorialCta, HOME_FALLBACK.editorialCta),
    carryEyebrow: str(remote.carryEyebrow, HOME_FALLBACK.carryEyebrow),
    carryHeading: str(remote.carryHeading, HOME_FALLBACK.carryHeading),
    carryBody: str(remote.carryBody, HOME_FALLBACK.carryBody),
    carryImage: remote.carryImage ?? HOME_FALLBACK.carryImage,
    carryCta: str(remote.carryCta, HOME_FALLBACK.carryCta),
    shorelineHandle: str(remote.shorelineHandle, HOME_FALLBACK.shorelineHandle),
    shorelineHeading: str(
      remote.shorelineHeading,
      HOME_FALLBACK.shorelineHeading,
    ),
    shorelineBody: str(remote.shorelineBody, HOME_FALLBACK.shorelineBody),
  };
}

export type {
  IHomeContent,
  IAssurance,
} from "@/lib/contentful/home/homeClient";
