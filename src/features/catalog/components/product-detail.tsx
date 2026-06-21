"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cart.store";
import { useSettings } from "@/app/providers/settings-provider";
import { CATEGORY_LABELS } from "@/features/catalog/constants/products";
import type { ICatalogProduct } from "@/features/catalog/types";
import { formatPrice } from "@/lib/format";
import { stockStatus, variantKey } from "@/features/catalog/lib/stock";

interface IProductDetailProps {
  product: ICatalogProduct;
  /**
   * Per-variant stock keyed by `slug|Color|Size`. A missing key means in stock
   * (Airtable down or row absent); only an explicit 0 is out of stock.
   */
  stock?: Record<string, number>;
}

const QTY_BTN =
  "h-[54px] w-[46px] text-xl text-stone transition-colors hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal";

export function ProductDetail({ product, stock = {} }: IProductDetailProps) {
  const add = useCartStore((s) => s.add);
  const { currency, freeShipThreshold } = useSettings();
  const [color, setColor] = useState(product.colors[0]?.name ?? "");
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [qty, setQty] = useState(1);

  const selectedStock = stock[variantKey(product.slug, color, size)];
  const selectedStatus = stockStatus(selectedStock);
  const isOut = selectedStatus === "out";

  const handleAdd = () => {
    if (stockStatus(stock[variantKey(product.slug, color, size)]) === "out") {
      toast("That option just sold out");
      return;
    }
    add(product, color, size, qty);
    toast("Added to bag");
  };

  return (
    <div className="max-w-[460px]">
      <span className="text-[11px] tracking-[0.24em] uppercase text-clay">
        {CATEGORY_LABELS[product.category]}
      </span>
      <h1 className="mt-3 font-serif text-[34px] leading-[1.05] text-teal sm:text-[44px]">
        {product.name}
      </h1>
      <p className="mt-4 text-[22px] text-[#5A5247]">
        {formatPrice(product.price, product.currency)}
      </p>
      <p className="mt-[22px] text-base leading-[1.7] font-light text-stone-deep">
        {product.blurb}
      </p>

      {/* colour */}
      <div className="mt-[34px]">
        <div className="mb-[13px] flex items-center justify-between">
          <span className="text-[11px] tracking-[0.18em] uppercase text-ink">
            Colour
          </span>
          <span className="text-[13px] text-stone">{color}</span>
        </div>
        <div className="flex gap-3">
          {product.colors.map((c) => {
            const on = color === c.name;
            return (
              <button
                key={c.name}
                type="button"
                title={c.name}
                aria-label={`Select colour ${c.name}`}
                aria-pressed={on}
                onClick={() => setColor(c.name)}
                className={`size-[38px] cursor-pointer rounded-full transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                  on
                    ? "shadow-[0_0_0_2px_var(--color-cream),0_0_0_4px_var(--color-teal)]"
                    : "shadow-[inset_0_0_0_1px_rgba(42,38,32,0.14)]"
                }`}
                style={{ background: c.hex }}
              />
            );
          })}
        </div>
      </div>

      {/* size */}
      <div className="mt-[30px]">
        <span className="mb-[13px] block text-[11px] tracking-[0.18em] uppercase text-ink">
          {product.sizeLabel}
        </span>
        <div className="flex flex-wrap gap-2.5">
          {product.sizes.map((s) => {
            const on = size === s;
            const sizeOut =
              stockStatus(stock[variantKey(product.slug, color, s)]) === "out";
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                aria-disabled={sizeOut}
                title={sizeOut ? `${s} — out of stock` : undefined}
                onClick={() => setSize(s)}
                className={`min-w-[52px] cursor-pointer border px-4 py-3 text-[13px] tracking-[0.04em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                  on
                    ? "border-teal bg-teal text-white"
                    : "border-line-deep bg-transparent text-[#5A5247] hover:border-teal"
                } ${sizeOut ? "line-through opacity-40" : ""}`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* qty + add */}
      <div className="mt-9 flex items-stretch gap-3.5">
        <div className="flex items-center border border-line-deep">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            className={QTY_BTN}
          >
            −
          </button>
          <span className="w-10 text-center text-base text-ink">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            aria-label="Increase quantity"
            className={QTY_BTN}
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isOut}
          aria-disabled={isOut}
          className="flex-1 rounded-full border border-teal bg-teal px-8 text-[12px] tracking-[0.18em] uppercase text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100"
        >
          {isOut
            ? "Out of stock"
            : `Add to bag — ${formatPrice(product.price, product.currency)}`}
        </button>
      </div>

      {isOut ? (
        <p className="mt-3 text-[13px] text-clay">
          This option is sold out — try another colour or size.
        </p>
      ) : selectedStatus === "low" ? (
        <p className="mt-3 text-[13px] text-clay">Only {selectedStock} left.</p>
      ) : null}

      {/* details */}
      <div className="mt-[38px] border-t border-line">
        <div className="flex gap-[18px] border-b border-line py-5">
          <span className="flex-[0_0_120px] text-[11px] tracking-[0.16em] uppercase text-clay">
            Materials
          </span>
          <span className="text-[14.5px] leading-[1.6] font-light text-stone-deep">
            {product.materials}
          </span>
        </div>
        <div className="flex gap-[18px] border-b border-line py-5">
          <span className="flex-[0_0_120px] text-[11px] tracking-[0.16em] uppercase text-clay">
            Shipping
          </span>
          <span className="text-[14.5px] leading-[1.6] font-light text-stone-deep">
            Ships from Metro Manila in 3–5 days. Free over{" "}
            {formatPrice(freeShipThreshold, currency)}.
          </span>
        </div>
      </div>
    </div>
  );
}
