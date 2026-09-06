import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Contentful asset CDN (product/content imagery)
      { protocol: "https", hostname: "images.ctfassets.net" },
      // Supabase Storage — public `media` bucket (product + content imagery)
      {
        protocol: "https",
        hostname: "wsdahucinbnzvuoluqft.supabase.co",
        pathname: "/storage/v1/object/public/media/**",
      },
      // Alesea villa photography used in the storefront design (HOME_FALLBACK)
      { protocol: "https", hostname: "lirp.cdn-website.com" },
    ],
  },
};

export default nextConfig;
