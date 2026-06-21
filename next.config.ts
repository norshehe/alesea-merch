import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Contentful asset CDN (product/content imagery)
      { protocol: "https", hostname: "images.ctfassets.net" },
      // Alesea villa photography used in the storefront design
      { protocol: "https", hostname: "lirp.cdn-website.com" },
    ],
  },
};

export default nextConfig;
