---
name: brand-system
description: alesea.co brand design system the storefront mirrors — fonts, palette hexes, and pill-button CTA style.
metadata:
  type: project
---

The alesea-merch storefront's design system is aligned to the main alesea.co website so the two read as one brand.

**Fonts** (via `next/font/google` in `src/app/layout.tsx`, exposed as Tailwind `font-serif`/`font-sans` through `@theme` in `src/app/globals.css`):
- Headings / wordmark: **Playfair Display** (serif) → `--font-serif` / `font-serif`.
- Body, nav, buttons: **Montserrat** (sans) → `--font-sans` / `font-sans`.

**Brand palette** (exact alesea.co hexes, defined as `@theme` color tokens in globals.css):
- Cream / page bg `#F6F1EB` (`--color-cream`)
- Sand / beige surface `#DBD0C3` (`--color-sand`)
- Teal (primary / buttons) `#084E50` (`--color-teal`)
- Ink / dark text `#201D14` (`--color-ink`)
- Dark slate `#22343A` (`--color-slate`)
- Near-white foam `#FBF8F2` (`--color-foam`)

**Primary CTA style (pill, matches alesea.co `--btn-*`)**: `rounded-full border border-teal bg-teal px-8 py-4 text-[12px] tracking-[0.18em] uppercase text-white hover:brightness-110` + teal focus-visible ring. Secondary/outline: `rounded-full border border-teal bg-transparent text-teal uppercase tracking-[0.18em] hover:bg-teal hover:text-white` (on dark hero, use foam border/text instead of teal for contrast).

**Why:** brand-consistency directive to make the merch storefront and alesea.co look like one brand.

**How to apply:** Marketing/action CTAs (hero, shop, Add to bag, Checkout, Place order, empty/success-state CTAs, header Book Now) use the teal pill style. Do NOT pill-ify utility controls — quantity steppers stay rectangular, filter chips / color-size selectors / quick-add `+` keep their existing shape, discount-apply button stays rectangular. Storefront CTAs are custom-styled inline (the shadcn `src/components/ui/button.tsx` is unused by the storefront). Product swatch hexes in `src/features/catalog/constants/products.ts` are product colours, NOT brand chrome — never snap them to brand tokens. Money always via `formatPrice`; never hardcode currency.
