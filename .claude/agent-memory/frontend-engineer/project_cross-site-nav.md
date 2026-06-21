---
name: cross-site-nav
description: Header/footer surface main alesea.co nav, Book Now CTA, and social links from siteSettings; internal vs external link rendering rules.
metadata:
  type: project
---

The storefront chrome (header/footer) is wired to feel like an extension of the main alesea.co site. Nav, Book Now CTA, and social links all come from Contentful `siteSettings` with per-field fallbacks to the real production URLs.

**Why:** alesea-merch is the shop arm of alesea.co; cross-sell to the hotel/booking system is a primary goal. Book Now is the key cross-sell and must stay visible even on mobile.

**How to apply:**
- Internal vs external links use `isExternalHref` (`src/lib/links.ts`) + the shared `NavLink` component (`src/components/layout/nav-link.tsx`). NavLink has no hooks so it works in both Server (footer) and Client (header) components.
- Tab rules: main-site nav (Villas & Suites, About) opens in the SAME tab (seamless feel) — no `newTab`. Book Now and social links open in a NEW tab (`newTab` prop → `target="_blank"`). All external anchors always get `rel="noopener noreferrer"`.
- Fallbacks live in `SETTINGS_FALLBACK` (`src/features/catalog/server/settings.ts`) and carry the REAL alesea.co URLs (villas: `https://www.alesea.co/villas---suites`, about: `https://www.alesea.co/about-alesea`, bookNow: `https://book.alesea.co/all-listings`), so nav stays correct even if Contentful is empty/unreachable.

Related: [[alesea-shop-storefront]]
