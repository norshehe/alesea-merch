---
name: design-patterns-alesea
description: Canonical Alesea storefront design patterns — card layout, grid breakpoints, empty states, CTA buttons, section anatomy — derived from Alesea-Shop.dc.html audit
metadata:
  type: project
---

## Product Card

- Aspect ratio: 4/5, dc-stripe placeholder fill, `next/image` when real photos land
- Quick-add FAB: 42×42px (below 44px minimum — fix to size-[44px]), absolute bottom-right, bg-foam → hover:bg-teal
- Below-image metadata: eyebrow (10.5px/tracking-[0.2em]/text-clay), name (Marcellus 19px/text-teal), price row (15px/text-[#5A5247] — needs a `--color-price` token) + color swatches
- Swatches in cards: 12px circles (size-3), color from `color.hex` dynamic style

## Grid Breakpoints

- Product grid: `grid-cols-2 lg:grid-cols-4` — no md intermediate (intentional per design; 4-col only on ≥1024px)
- Shop-by-category: `grid-cols-1 md:grid-cols-3`
- Shoreline (Instagram) grid: `grid-cols-3 sm:grid-cols-6`
- Cart/Checkout two-col: `grid-cols-1 lg:grid-cols-[1fr_360px]` / `[1fr_380px]`

## Section Anatomy (home sections)

- Eyebrow: 12px / tracking-[0.32em] / uppercase / text-teal
- h2: Marcellus 46–50px on desktop, scales down with sm: prefix; text-teal
- Body/descriptor paragraph: 15–16px / font-light / text-stone or text-stone-deep
- CTA link: bg-teal, px-[32–34px] py-[15–16px], text-xs tracking-[0.18em] uppercase text-white hover:brightness-110
- Section padding: `px-6 pt-[84px] pb-24 sm:px-14` (standard); assurances `py-[62px]`

## Empty States

- Cart drawer empty: Marcellus 21px teal + "Keep shopping" teal CTA
- Cart view empty: Marcellus 26px teal + body stone + "Browse the collection" teal CTA
- Checkout empty: same copy pattern

## Color Tokens Missing From globals.css

These hex values appear in the design source and/or the build but have no named token:
- `#3A352E` — dark driftwood (hero/editorial image pane bg)
- `#5A5247` — price text / unselected interactive text (between stone-deep and ink)
- `#C4B79C` — placeholder foreground (warm stone, lighter than shell)
- `#B6A988` — shot-label text (warm tan, lighter than clay)
- `#EBE1CC` — assurances title on teal bg
- `#E9DFCD` / `#EDE6D8` — hero eyebrow / hero body text on dark overlay
- `#DCD0BC` — divider variant (heavier than line-deep #D9CFBC)
- `#F0E9DC` / `#F0EADD` — drawer footer bg / selected delivery bg (lighter sand variants)
- `#E0D6C2` — unselected delivery border
- `#EFE9DD` — disabled field bg
- `#D9CEBC` / `#A99E8B` / `#8B8170` — footer text hierarchy on teal background
- `#1C1812` — overlay scrim color

## Tap Targets

- Qty stepper in drawer: h-8 (32px) × w-[30px] — below 44px on both axes. Design spec: 30×32px which is also below. Fix both to min 44px.
- Qty stepper in cart-view: h-10 (40px) × w-[38px] — marginally below 44px width. Design: 38×40px.
- Color swatches in product-detail: 38×38px — below 44px. Size to 44px minimum.

## Accessibility Gaps

- CartDrawer uses a plain `div[role=dialog]` with a `<button>` overlay as the backdrop — should use `<Sheet>` (available in `src/components/ui/sheet.tsx`) for proper focus trap, portal, and scroll-lock
- No `focus-visible` ring on any CTA button, filter chip, size button, or swatch across the entire codebase
- Gallery thumbnails on product page have no `onClick`/keyboard support to switch the main image
- product-detail color swatch selected state: `ring-offset-teal` is wrong on cream page background; should be `ring-offset-cream`

## Image Placeholder Rules (from data-source swap audit)

Every `next/image` container must have a paired `else` branch with dc-stripe. The two surfaces that lack it:
- `hero.tsx` — when `heroImage` is null, no dc-stripe. Fix: `<div className="absolute inset-0 dc-stripe" />`
- `editorial-split.tsx` — when `editorialImage` is null, no dc-stripe. Same fix.

Rule: `{content.xImage ? <Image … /> : <div className="absolute inset-0 dc-stripe" />}` — always both branches, even for full-bleed hero images.

## Fallback Image URL Risk

`HOME_FALLBACK.heroImage` and `HOME_FALLBACK.editorialImage` point to `lirp.cdn-website.com` (external Wix CDN). These are whitelisted in `next.config.ts`, but if that domain goes dark the fallback silently shows nothing. Move villa photography to `/public/images/` and use local paths for true design-default reliability.

## Settings Fallback Gap

`getSiteSettings` in `settings.ts:79` only falls back to `SETTINGS_FALLBACK.navLinks` when `remote.navLinks.length > 0`. A Contentful entry with a blank `navLinks` field passes `toNavLinks` as `[]` and propagates through, producing a blank nav bar. Guard must also handle the zero-length case:
```ts
navLinks: Array.isArray(remote.navLinks) && remote.navLinks.length > 0
  ? remote.navLinks : SETTINGS_FALLBACK.navLinks
```

## Tap Target

- Quick-add button in product-card: `size-[42px]` = 42×42px, below 44px minimum. Fix: `size-[44px]`.

## Footer Token Pattern

Footer is on teal background and uses its own lighter text hierarchy (#D9CEBC body, #A99E8B blurb, #8B8170 section labels). These should become named tokens: `--color-foam-dim`, `--color-shell-dim`, `--color-stone-dim` or similar teal-on-dark variants.
