import "server-only";
import {
  getHomeContentFromSupabase,
  type IAssurance,
  type IHomeContent,
} from "@/lib/supabase/home/homeClient";
import type { IShopCategory } from "@/lib/supabase/types/shopCategory/response";
import { isSupabaseConfigured } from "@/lib/supabase/public";

/**
 * Hardcoded homepage defaults, mirroring the original design copy and imagery.
 * Used per-field when Supabase is unreachable or a field is empty, so the
 * home page renders identically to before the data-source swap.
 */
export const HOME_FALLBACK: IHomeContent = {
  heroEyebrow: "The Alesea Shop · La Union",
  heroHeading: "Carry the coast home.",
  heroBody:
    "Made for quiet getaways and sunny weekends. Tees and pieces of your favorite stay to bring home.",
  heroImage:
    "https://lirp.cdn-website.com/a93d3aad/dms3rep/multi/opt/Pool+View-2280w.jpg",
  heroPrimaryCta: "Shop the collection",
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
      title: "Heavyweight, premium material",
      body: "230 GSM cotton blend.",
    },
    {
      title: "Oversized, unisex fit",
      body: "Wear easy from day one.",
    },
    {
      title: "Heavy ribbed collar",
      body: "Designed to keep its shape, wash after wash.",
    },
    {
      title: "Color that stays true",
      body: "Deep dye, no fading under summer sun.",
    },
  ],
  editorialEyebrow: "Made for the morning swim",
  editorialHeading: "Designed at the villa. Worn down the coast.",
  // The editorial section is now a tee gallery (see editorial-split.tsx); its
  // old body paragraph + quote were removed from the content shape entirely.
  editorialImage:
    "https://lirp.cdn-website.com/a93d3aad/dms3rep/multi/opt/Bath+Amenities-909h.jpg",
  editorialCta: "Shop everything",
  carryEyebrow: "Alesea Carry",
  carryHeading: "Your beach day, fully packed.",
  carryBody:
    "From market runs to island hops, the Carry line holds the whole day. Water-resistant canvas, wipe-clean linings, and straps built for the boat — so you can pack light and stay long.",
  carryImage: null,
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
 * Fully-typed homepage content for Server Components. Supabase first, with
 * per-field fallback to the original design copy. Image fields keep the
 * Supabase URL when present, else the original CDN image (or null).
 */
export async function getHomeContent(): Promise<IHomeContent> {
  // Editorial copy is presentational — a missing config degrades to the design
  // defaults rather than failing the home page.
  if (!isSupabaseConfigured()) {
    console.warn("[home] Supabase is not configured — using design defaults.");
    return HOME_FALLBACK;
  }

  let remote: IHomeContent | null = null;
  try {
    remote = await getHomeContentFromSupabase();
  } catch (error) {
    console.warn(
      "[home] Supabase home_content fetch failed — using design defaults.",
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
    editorialImage: remote.editorialImage ?? HOME_FALLBACK.editorialImage,
    editorialCta: str(remote.editorialCta, HOME_FALLBACK.editorialCta),
    carryEyebrow: str(remote.carryEyebrow, HOME_FALLBACK.carryEyebrow),
    carryHeading: str(remote.carryHeading, HOME_FALLBACK.carryHeading),
    carryBody: str(remote.carryBody, HOME_FALLBACK.carryBody),
    carryImage: remote.carryImage ?? HOME_FALLBACK.carryImage,
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
} from "@/lib/supabase/home/homeClient";
