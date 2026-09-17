/** Public Storage bucket holding all product and content imagery. */
export const MEDIA_BUCKET = "media";

/**
 * Build the public URL for an object in the `media` bucket.
 *
 * Constructed by hand rather than via `supabase.storage.getPublicUrl()` so this
 * stays a pure, sync function usable from normalization code paths.
 */
export function publicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

/**
 * Resolve a content image stored as a `*_path` / `*_url` pair.
 *
 * `_path` (an object in the `media` bucket) wins so migrated assets take over
 * from the legacy external `_url`, which stays as the fallback for images that
 * were never uploaded. Null when neither is set.
 */
export function resolveImageUrl(
  path: string | null | undefined,
  url: string | null | undefined,
): string | null {
  return path ? publicUrl(path) : (url ?? null);
}
