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

## Forms: codebase convention diverges from the `form-builder` skill doc

Every form in the app (`checkout-view.tsx`, the new `email-signup-form.tsx`) uses raw styled `<input>`/`<button>` + manual RHF `register()`, not the shadcn `Form`/`FormField`/`FormControl`/`FormMessage`/`Input`/`Button` primitives the `form-builder` skill and CLAUDE.md describe. `src/components/ui/form.tsx`, `input.tsx`, `button.tsx` exist but are unused across `src/features/**`. This is a real, established (if non-compliant) codebase pattern — flag new forms as Major for skill-doc deviation, but don't treat it as a novel regression; it's consistent with prior art. Worth a real refactor pass eventually to converge both on shadcn primitives.

## Header "Back to Alesea" link — tap target

`site-header.tsx` added a persistent `<ArrowLeft/>` + "Back to Alesea" `NavLink` at the start of the left nav. On mobile the text is `hidden sm:inline`, leaving only the icon (`size-3.5` = 14px) with no padding as the tap target — well under the 44px minimum, and it sits on every page (sticky header). `NavLink` (`site-header.tsx`/`nav-link.tsx`) has no built-in padding; callers must add their own hit-area sizing.

## Coming-soon product card breaks grid uniformity

`product-card.tsx`'s `product.comingSoon` branch renders a materially different card anatomy — adds a blurb paragraph and a full `EmailSignupForm` (input + button) inside the grid tile — while sibling cards in the same `ProductGrid` are just image/category/name/price/swatches. This taller card stretches the shared grid row and reads as visually inconsistent. Prefer keeping the *grid* tile minimal (name + "Notify me" link to the PDP) and reserving the full email-capture form for the product detail page, which already has its own `comingSoon` branch in `product-detail.tsx`.

## Coming-soon blurb color token drift + reinforces existing grid-uniformity note

`product.blurb` now also renders on the coming-soon *card* (not just the PDP), but with `text-stone` — the PDP's same field uses `text-stone-deep` (`product-detail.tsx:59-61`). Same semantic content field, two different muted tokens across surfaces; normalize. This adds to the existing [[design-patterns-alesea]] note above about coming-soon cards breaking grid uniformity — the blurb addition makes that ragged-row problem worse, not better.

## Quick-add size-picker overlay (product-card.tsx) — z-index collision pattern to watch for

When a card's quick-add "+" button opens an inline overlay/panel anchored to the same `relative` image container (`absolute inset-x-0 bottom-0 ...`), check the geometry against the trigger button's own `absolute right-3 bottom-3 size-11` box. Neither had an explicit `z-index` in the reviewed instance, so the later-DOM overlay painted over the trigger once opened, making the "close" affordance (re-clicking "+") invisible/unclickable. Rule of thumb for this codebase: any disclosure panel anchored inside the same positioned container as its trigger button needs an explicit `z-10`+ on the trigger (or the panel must not geometrically overlap the trigger's box) — verify with real dimensions, not just class names.

## Two size-pill treatments now exist — should share one component

PDP canonical size pill (`product-detail.tsx:118-141`): `min-w-[52px] px-4 py-3 text-[13px]`, with selected (`border-teal bg-teal text-white`) and out-of-stock (`line-through opacity-40`) states.
Product-card quick-add pill (`product-card.tsx:167-180`, new): `min-w-[38px] px-3 py-2 text-[12px]`, no selected state — smaller and under the 44px tap-target floor. These should be one shared `SizePill` component/class string, not two hand-maintained copies that drift in size.

## Native `<select>` used for cart line variant editing instead of Shadcn `Select`

`src/features/cart/components/cart-line-variants.tsx` (new) hand-styles a raw `<select>` to look like the coastal-minimal button treatment, but `src/components/ui/select.tsx` (Radix Shadcn Select) exists in the repo and is otherwise **unused anywhere in `src/features/**`** — so this is the first real "should we use Select" decision point in the codebase. Native `<option>` popups can't be restyled (breaks uppercase/tracking aesthetic the moment it opens). Recommend migrating to `Select`/`SelectTrigger`/`SelectContent` here and treating it as the precedent for future dropdowns, rather than letting native-select-with-custom-trigger become the pattern.

## CMS fields going hardcoded / orphaned (content-boundary regressions)

Watch for components hardcoding copy/data that a Contentful-backed settings/content type still fetches — this silently breaks CMS editability:
- `site-footer.tsx` hardcodes the footer blurb ("We can't wait to see you in these.") and a `PHONE` const, even though `ISiteSettings.footerBlurb` and `.contactAddress` are still fetched/typed and now go unused.
- `IHomeContent.heroSecondaryCta` and `.carryCta` are still fetched from Contentful (`homeClient.ts`) but no longer rendered anywhere (`hero.tsx` dropped the secondary CTA link; `carry-feature.tsx` replaced its CTA link with `EmailSignupForm`). Orphaned schema fields — either wire them back up or remove from the content type/response shape.
