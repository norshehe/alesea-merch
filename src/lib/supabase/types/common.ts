import { resolveImageUrl } from "@/lib/supabase/storage";

/** Normalized image consumed by the layout/UI. */
export interface IImage {
  url: string;
  title: string;
  width: number;
  height: number;
}

/**
 * Build an `IImage` from a `*_path` / `*_url` column pair plus its dimensions.
 * Returns null when neither source resolves, so callers can fall back.
 */
export function toImage(
  path: string | null | undefined,
  url: string | null | undefined,
  alt: string | null | undefined,
  width: number | null | undefined,
  height: number | null | undefined,
): IImage | null {
  const resolved = resolveImageUrl(path, url);
  if (!resolved) return null;
  return {
    url: resolved,
    title: alt ?? "",
    width: width ?? 0,
    height: height ?? 0,
  };
}
