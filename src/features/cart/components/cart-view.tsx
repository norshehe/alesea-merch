"use client";

import Link from "next/link";
import { useCartStore } from "@/store/cart.store";
import { useSettings } from "@/app/providers/settings-provider";
import { formatPrice } from "@/lib/format";
import { freeShipHint, standardShipping } from "@/features/cart/lib/shipping";

const QTY_BTN =
  "flex h-10 w-[38px] items-center justify-center text-[17px] text-stone transition-colors hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal";

export function CartView() {
  const lines = useCartStore((s) => s.lines);
  const changeQuantity = useCartStore((s) => s.changeQuantity);
  const remove = useCartStore((s) => s.remove);
  const subtotal = useCartStore((s) => s.subtotal());
  const { currency, freeShipThreshold, standardShipping: standardRate } =
    useSettings();

  const shipping = standardShipping(subtotal, freeShipThreshold, standardRate);
  const total = subtotal + shipping;
  const isEmpty = lines.length === 0;

  return (
    <div className="min-h-[60vh] px-6 pt-12 pb-[110px] sm:px-14">
      <Link
        href="/"
        className="mb-[26px] inline-block text-[11.5px] tracking-[0.16em] uppercase text-stone transition-colors hover:text-ink"
      >
        ← Continue shopping
      </Link>
      <h1 className="mb-9 font-serif text-[36px] text-teal sm:text-[46px]">
        Your bag
      </h1>

      {isEmpty ? (
        <div className="border-t border-line py-20 text-center">
          <p className="font-serif text-[26px] text-teal">Your bag is empty.</p>
          <p className="mt-2.5 text-[15px] font-light text-stone">
            Nothing packed for the coast just yet.
          </p>
          <Link
            href="/#shop-grid"
            className="mt-[26px] inline-block rounded-full border border-teal bg-teal px-8 py-4 text-[12px] tracking-[0.18em] uppercase text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          >
            Browse the collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[1fr_360px]">
          <div className="border-t border-line">
            {lines.map((line) => (
              <div
                key={line.key}
                className="flex gap-[22px] border-b border-line py-[26px]"
              >
                <div
                  className="dc-stripe aspect-4/5 flex-[0_0_92px]"
                  aria-hidden
                />
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between gap-4">
                    <span className="font-serif text-xl text-teal">
                      {line.name}
                    </span>
                    <span className="text-base text-ink">
                      {formatPrice(line.price * line.quantity, line.currency)}
                    </span>
                  </div>
                  <span className="mt-[5px] text-[12.5px] tracking-[0.08em] uppercase text-clay">
                    {line.color} · {line.size}
                  </span>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <div className="flex items-center border border-line-deep">
                      <button
                        type="button"
                        onClick={() => changeQuantity(line.key, -1)}
                        aria-label={`Decrease quantity of ${line.name}`}
                        className={QTY_BTN}
                      >
                        −
                      </button>
                      <span className="w-[34px] text-center text-sm">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(line.key, 1)}
                        aria-label={`Increase quantity of ${line.name}`}
                        className={QTY_BTN}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(line.key)}
                      className="text-[11px] tracking-[0.14em] uppercase text-clay transition-colors hover:text-teal"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-sand px-8 py-[34px]">
            <h2 className="mb-[22px] font-serif text-[23px] text-teal">
              Order summary
            </h2>
            <div className="flex justify-between py-[11px] text-[14.5px] text-stone-deep">
              <span>Subtotal</span>
              <span className="text-ink">{formatPrice(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between border-b border-[#DCD0BC] py-[11px] text-[14.5px] text-stone-deep">
              <span>Shipping</span>
              <span className="text-ink">
                {shipping === 0 ? "Free" : formatPrice(shipping, currency)}
              </span>
            </div>
            <div className="flex justify-between pt-[18px] pb-1 text-[18px] text-ink">
              <span className="font-serif">Total</span>
              <span className="font-serif">{formatPrice(total, currency)}</span>
            </div>
            <Link
              href="/checkout"
              className="mt-6 block w-full rounded-full border border-teal bg-teal py-4 text-center text-[12px] tracking-[0.18em] uppercase text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            >
              Checkout
            </Link>
            <p className="mt-3.5 text-center text-xs font-light text-clay">
              {freeShipHint(subtotal, freeShipThreshold, currency)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
