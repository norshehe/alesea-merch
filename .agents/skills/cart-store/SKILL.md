---
name: cart-store
description: Add to, extend, or wire up the Zustand cart store and cart UI (add-to-cart buttons, cart drawer/sheet, line items, totals) following alesea-merch conventions. Use whenever the user wants add-to-cart behavior, a cart drawer, to track cart state, update quantities, show a cart badge/total, or says things like "add to cart", "build the cart", "cart drawer", or "track items in the cart".
---

# Cart Store & UI

The cart is the storefront's single piece of global **client** state. It lives in `src/store/cart.store.ts` (Zustand + `persist` to `localStorage`). Server data (products) never goes here.

Read first: `src/store/cart.store.ts` (the existing store).

## The store API

```ts
const lines = useCartStore((s) => s.lines);     // ICartLine[]
const add = useCartStore((s) => s.add);         // (product: IProduct, qty?) => void
const remove = useCartStore((s) => s.remove);   // (id) => void
const setQuantity = useCartStore((s) => s.setQuantity);
const clear = useCartStore((s) => s.clear);
const count = useCartStore((s) => s.count());   // total item count
const subtotal = useCartStore((s) => s.subtotal());
```

## Rules

1. **Narrow subscriptions.** Select only the slice a component needs (`useCartStore((s) => s.count())`), never the whole store — avoids needless re-renders.
2. **Add the whole `IProduct`** to `add()`; the store snapshots the fields it needs into an `ICartLine`. Don't pass partial objects.
3. **Quantity ≤ 0 removes the line** (already handled by `setQuantity`).
4. **Persistence**: the store persists under key `alesea-cart`. If you change `ICartLine`'s shape, bump/clear the persisted key or add a `migrate` to avoid hydration shape drift.
5. **Hydration**: cart-dependent UI must be a Client Component. Guard against SSR/client count mismatch (e.g. render the badge only after mount) to avoid hydration warnings.
6. **Feedback**: on add, fire a Sonner `toast.success` ("Added to cart"). Money via `Intl.NumberFormat` + the line `currency`.

## Common UI pieces

- **Add-to-cart button** — Client Component; calls `add(product)` + toast.
- **Cart badge** — header indicator using `count()`; mount-guarded.
- **Cart drawer** — `Sheet` from `src/components/ui`; lists `lines`, quantity steppers (`setQuantity`), remove buttons, subtotal, checkout CTA.
- **Empty cart** — calm empty state with a link back to the catalog.

## Extending the store

When adding fields (e.g. variant/size selection), extend `ICartLine` and the `add` signature, update the line key (an item with a different variant is a different line — key by `id + variant`), and handle persisted-shape migration. Keep derived values (`count`, `subtotal`) as selector functions.

After changes: `pnpm exec tsc --noEmit`.
