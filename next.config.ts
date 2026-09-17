import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

/**
 * Supabase Storage host, derived from the same env var `publicUrl()` builds
 * image URLs from. Hardcoding a project ref here would 400 every `next/image`
 * request the moment the env pointed at another project (staging, a branch DB).
 */
function supabaseImagePattern(): RemotePattern[] {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return [];

  try {
    const { hostname, protocol } = new URL(base);
    return [
      {
        protocol: protocol === "http:" ? "http" : "https",
        hostname,
        pathname: "/storage/v1/object/public/media/**",
      },
    ];
  } catch {
    console.warn(
      "[next.config] NEXT_PUBLIC_SUPABASE_URL is not a valid URL — Supabase images will be blocked.",
    );
    return [];
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage — public `media` bucket (product + content imagery)
      ...supabaseImagePattern(),
      // Alesea villa photography used in the storefront design (HOME_FALLBACK)
      { protocol: "https", hostname: "lirp.cdn-website.com" },
    ],
  },
};

export default nextConfig;
