---
name: same-page-hash-nav
description: Same-page anchor CTAs (e.g. #shop-grid) must use native <a>, not next/link, or repeat clicks don't scroll
metadata:
  type: feedback
---

For CTAs that jump to an anchor on the SAME page (home page hero/editorial → `#shop-grid`), use a native `<a href="#shop-grid">`, NOT `<Link href="/#shop-grid">`.

**Why:** Next.js 16 App Router `<Link>` skips re-scrolling when the target URL hash is already the current hash. Empirically reproduced (Playwright, 2026-07-22): first click scrolls, but after scrolling back up a second click on the same `/#shop-grid` Link is a no-op (scrollY stays 0) — this is the "Shop Everything doesn't lead anywhere" bug. A native `<a>` uses browser-native anchor scrolling and re-scrolls every time. Fix verified: repeat clicks scroll reliably.

**How to apply:** On-page hash CTAs → native `<a href="#anchor">` (no leading slash — a leading `/` on an `<a>` triggers a full nav to `/`). CROSS-page instances that navigate to home first (cart-view, checkout-view, product page, site-footer) keep `<Link href="/#shop-grid">` — those work fine because the route actually changes. See [[project_cross-site-nav]].
