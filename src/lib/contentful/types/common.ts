import type { Asset, EntryFieldTypes } from "contentful";

/** Normalized image extracted from a Contentful Asset. */
export interface IImage {
  url: string;
  title: string;
  width: number;
  height: number;
}

/** Result of a collection query, normalized for our React Query handlers. */
export interface ICollection<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

/** Helper for typed Contentful entry skeletons. */
export type Fields<T extends Record<string, EntryFieldTypes.Symbol | unknown>> = T;

/** Map a Contentful Asset to our normalized IImage (or null when absent). */
export function toImage(asset: Asset | undefined): IImage | null {
  const file = asset?.fields?.file;
  if (!file?.url) return null;
  const url = String(file.url);
  const details = file.details as { image?: { width: number; height: number } };
  return {
    url: url.startsWith("//") ? `https:${url}` : url,
    title: (asset?.fields?.title as string) ?? "",
    width: details?.image?.width ?? 0,
    height: details?.image?.height ?? 0,
  };
}
