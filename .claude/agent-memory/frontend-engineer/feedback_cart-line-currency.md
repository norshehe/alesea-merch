---
name: cart-line-currency
description: Cart lines must carry their own currency and format per-line totals with it — not the global settings currency.
metadata:
  type: feedback
---

`ICartLine` (in `src/store/cart.store.ts`) must include `currency: string`, copied from `product.currency` in `add()`. Per-line item prices in cart-view, cart-drawer, and checkout-view must format with `line.currency`. Cart aggregates (subtotal/shipping/total) format with the settings currency from `useSettings()`.

**Why:** `ICatalogProduct` and the Contentful `product` model both carry a per-product `currency` (PHP|USD). CLAUDE.md requires formatting money with the product's own currency, never a hardcoded or global one. A reviewer caught lines being formatted with the global settings currency, which would mis-render a USD product in a PHP-default storefront. This is a recurring trap because the cart store originally copied only `price`, not `currency`.

**How to apply:** Whenever adding a money field to the cart or a new cart surface, carry and use `line.currency` for item-level amounts. See [[alesea-shop-storefront]] for the broader money-formatting convention (`formatPrice(amount, currency)` from `@/lib/format`).
