import { createClient, type ContentfulClientApi } from "contentful";

const space = process.env.NEXT_PUBLIC_CONTENTFUL_SPACE_ID;
const environment = process.env.NEXT_PUBLIC_CONTENTFUL_ENVIRONMENT ?? "master";
const deliveryToken = process.env.CONTENTFUL_DELIVERY_TOKEN;
const previewToken = process.env.CONTENTFUL_PREVIEW_TOKEN;
const previewEnabled = process.env.NEXT_PUBLIC_CONTENTFUL_PREVIEW === "true";

if (!space || !deliveryToken) {
  // Fail loud at module load so misconfiguration is caught in dev, not at request time.
  throw new Error(
    "Missing Contentful config: set NEXT_PUBLIC_CONTENTFUL_SPACE_ID and CONTENTFUL_DELIVERY_TOKEN in .env.local",
  );
}

/**
 * Single shared Contentful client. Uses the Preview API when
 * NEXT_PUBLIC_CONTENTFUL_PREVIEW=true (draft content), otherwise the Delivery API.
 *
 * Import this in *Client.ts files only — never call createClient elsewhere.
 */
export const contentful: ContentfulClientApi<undefined> = createClient({
  space,
  environment,
  accessToken: previewEnabled ? (previewToken ?? deliveryToken) : deliveryToken,
  host: previewEnabled ? "preview.contentful.com" : "cdn.contentful.com",
});

export const isPreview = previewEnabled;
