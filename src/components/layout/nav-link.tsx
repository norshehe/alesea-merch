import Link from "next/link";
import { isExternalHref } from "@/lib/links";

interface INavLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
  /**
   * Open external links in a new tab. Use for separate platforms (Book Now,
   * social). Leave false for main-site nav so it feels like one seamless site.
   */
  newTab?: boolean;
  "aria-label"?: string;
}

/**
 * Renders a `next/link` for internal hrefs and a plain anchor for external
 * ones ({@link isExternalHref}). External anchors always get
 * `rel="noopener noreferrer"`; new-tab links also get `target="_blank"`.
 * No hooks, so it is safe in both Server and Client components.
 */
export function NavLink({
  href,
  className,
  children,
  newTab = false,
  "aria-label": ariaLabel,
}: INavLinkProps) {
  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        className={className}
        aria-label={ariaLabel}
        rel="noopener noreferrer"
        {...(newTab ? { target: "_blank" } : {})}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
