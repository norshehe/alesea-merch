"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useCartStore } from "@/store/cart.store";
import { useSettings } from "@/app/providers/settings-provider";
import { formatPrice } from "@/lib/format";
import { freeShipHint } from "@/features/cart/lib/shipping";
import { CartLineVariants } from "@/features/cart/components/cart-line-variants";

const QTY_BTN =
  "flex h-8 w-[30px] items-center justify-center text-[15px] text-stone transition-colors hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal";

export function CartDrawer() {
  const open = useCartStore((s) => s.open);
  const closeCart = useCartStore((s) => s.closeCart);
  const lines = useCartStore((s) => s.lines);
  const changeQuantity = useCartStore((s) => s.changeQuantity);
  const remove = useCartStore((s) => s.remove);
  const count = useCartStore((s) => s.count());
  const subtotal = useCartStore((s) => s.subtotal());
  const { currency, freeShipThreshold } = useSettings();

  // Close on Escape and lock background scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, closeCart]);

  if (!open) return null;

  const isEmpty = lines.length === 0;

  return (
    <div role="dialog" aria-modal="true" aria-label="Your bag">
      <button
        type="button"
        aria-label="Close bag"
        onClick={closeCart}
        className="fixed inset-0 z-80 bg-[#1C1812]/[0.42]"
      />
      <div className="fixed top-0 right-0 z-90 flex h-full w-[420px] max-w-[92vw] flex-col bg-cream shadow-[-14px_0_40px_rgba(28,24,18,0.18)]">
        <div className="flex items-center justify-between border-b border-line px-7 py-6">
          <span className="font-serif text-[22px] text-teal">
            Your bag ({count})
          </span>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close bag"
            className="text-stone transition-colors hover:text-ink"
          >
            <X className="size-6" strokeWidth={1.4} />
          </button>
        </div>

        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <p className="font-serif text-[21px] text-teal">Nothing here yet</p>
            <button
              type="button"
              onClick={closeCart}
              className="mt-[18px] rounded-full border border-teal bg-teal px-7 py-3.5 text-[12px] tracking-[0.18em] uppercase text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            >
              Keep shopping
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-7 py-2">
              {lines.map((line) => (
                <div
                  key={line.key}
                  className="flex gap-4 border-b border-[#E8E0D0] py-5"
                >
                  <div
                    className="dc-stripe aspect-4/5 flex-[0_0_64px]"
                    aria-hidden
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-2.5">
                      <span className="font-serif text-base leading-tight text-teal">
                        {line.name}
                      </span>
                      <span className="whitespace-nowrap text-sm text-ink">
                        {formatPrice(line.price * line.quantity, line.currency)}
                      </span>
                    </div>
                    <CartLineVariants line={line} compact />
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="flex items-center border border-line-deep">
                        <button
                          type="button"
                          onClick={() => changeQuantity(line.key, -1)}
                          aria-label={`Decrease quantity of ${line.name}`}
                          className={QTY_BTN}
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-[13px]">
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
                        className="text-[10.5px] tracking-[0.12em] uppercase text-clay transition-colors hover:text-teal"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-line bg-[#F0E9DC] px-7 py-[22px]">
              <div className="mb-1.5 flex justify-between text-sm text-stone-deep">
                <span>Subtotal</span>
                <span className="font-serif text-[17px] text-ink">
                  {formatPrice(subtotal, currency)}
                </span>
              </div>
              <p className="mb-4 text-[11.5px] font-normal text-clay">
                {freeShipHint(subtotal, freeShipThreshold, currency)}
              </p>
              <Link
                href="/cart"
                onClick={closeCart}
                className="mb-2.5 block w-full rounded-full border border-teal bg-teal py-4 text-center text-[12px] tracking-[0.18em] uppercase text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
              >
                View bag &amp; checkout
              </Link>
              <button
                type="button"
                onClick={closeCart}
                className="w-full py-[13px] text-[11.5px] tracking-[0.16em] uppercase text-stone transition-colors hover:text-ink"
              >
                Continue shopping
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
