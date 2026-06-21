---
name: button-variant-guide
description: Reference guide for choosing the correct shadcn Button variant and size for any UI context in alesea-merch. Read when building buttons, choosing between variants, placing actions in pages/forms/dialogs/cards, or when asked "which button variant should I use" or "what button style for X".
---

# Button Variant Guide

`Button` lives at `@/components/ui/button`. Pick variant by **intent**, size by **context**.

## Variants

| Variant       | Use for                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `default`     | Primary action on a screen — Add to cart, Checkout, Subscribe, Submit   |
| `secondary`   | Secondary action next to a primary one                                  |
| `outline`     | Lower-emphasis actions — Continue shopping, filters, toggles            |
| `ghost`       | Toolbar / icon actions, nav items, low-emphasis controls               |
| `link`        | Inline navigation styled as text                                        |
| `destructive` | Removing items (remove from cart, clear cart) — confirm if irreversible |

## Sizes

| Size      | Use for                                          |
| --------- | ------------------------------------------------ |
| `default` | Standard buttons                                 |
| `sm`      | Dense areas — card actions, filter bars          |
| `lg`      | Hero CTAs, primary checkout button               |
| `icon`    | Icon-only buttons (cart, menu) — needs aria-label |

## Context rules

- **One primary (`default`) action per surface.** Everything else is `secondary`/`outline`/`ghost`.
- **Product card**: Add to cart = `default` `sm` (or `icon` for compact grids); ensure ≥44px tap target on mobile.
- **Cart drawer**: Checkout = `default` `lg`; quantity steppers = `outline`/`ghost` `icon`; remove = `ghost`/`destructive` `icon`.
- **Forms/dialogs**: Submit = `default`; Cancel = `outline` or `ghost`; order is Cancel then Submit (Submit rightmost).
- **Icon-only buttons** must have an `aria-label`.
- **Disabled/pending**: disable on submit and show a pending label; don't swap variant mid-action.
