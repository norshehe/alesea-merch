/**
 * True when an href points outside the storefront and should render as a plain
 * anchor instead of a Next.js `<Link>` (absolute http(s) URLs, mailto or tel).
 */
export function isExternalHref(href: string): boolean {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}
