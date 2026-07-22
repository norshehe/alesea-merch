"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cart.store";
import { CATEGORY_LABELS } from "@/features/catalog/constants/products";
import type { ICatalogProduct } from "@/features/catalog/types";
import { formatPrice } from "@/lib/format";
import { sizePillClass } from "@/features/catalog/lib/size-pill";
import { EmailSignupForm } from "@/features/catalog/components/email-signup-form";

interface IProductCardProps {
  product: ICatalogProduct;
  /** True when every variant is out of stock — disables quick-add, shows a label. */
  soldOut?: boolean;
}

/** Shared cover: Contentful image when present, else the `dc-stripe` placeholder. */
function CardCover({ product }: { product: ICatalogProduct }) {
  const cover = product.images[0];
  if (cover) {
    return (
      <Image
        src={cover.url}
        alt={cover.alt}
        fill
        sizes="(min-width: 768px) 33vw, 50vw"
        className="object-cover"
      />
    );
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center px-5 text-center">
      <span className="font-serif text-[22px] leading-tight text-[#C4B79C]">
        {product.name}
      </span>
    </div>
  );
}

export function ProductCard({ product, soldOut = false }: IProductCardProps) {
  // Coming-soon products have no price / add-to-bag. Per the client brief the
  // card carries an inline email input + "Notify Me" button. The card itself is
  // NOT a full-card <Link> (a form can't be nested in an <a>); the image and
  // name link to the PDP, the signup form sits below. Split into a separate
  // component so the quick-add hooks only run on the purchasable branch (Rules
  // of Hooks — no conditional hook calls).
  if (product.comingSoon) {
    return (
      <div className="flex flex-col">
        <Link
          href={`/products/${product.slug}`}
          className="group rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
          aria-label={`${product.name} — coming soon`}
        >
          <div className="dc-stripe relative aspect-4/5 overflow-hidden">
            <CardCover product={product} />
            <span className="absolute top-3 left-3 bg-teal px-2.5 py-1 text-[9.5px] tracking-[0.16em] uppercase text-white">
              Coming Soon
            </span>
          </div>
        </Link>
        <div className="flex flex-col gap-[7px] pt-4">
          <span className="text-[10.5px] tracking-[0.2em] uppercase text-clay">
            {CATEGORY_LABELS[product.category]}
          </span>
          <Link
            href={`/products/${product.slug}`}
            className="font-serif text-[19px] text-teal underline-offset-4 hover:underline"
          >
            {product.name}
          </Link>
          <p className="line-clamp-2 min-h-[42px] text-[13px] leading-[1.6] font-normal text-stone-deep">
            {product.blurb}
          </p>
          <EmailSignupForm
            source="weekender-tote"
            variant="stacked"
            className="mt-2"
          />
        </div>
      </div>
    );
  }

  return <ActiveProductCard product={product} soldOut={soldOut} />;
}

/** Purchasable card: quick-add "+" with an inline size picker for multi-size products. */
function ActiveProductCard({
  product,
  soldOut,
}: {
  product: ICatalogProduct;
  soldOut: boolean;
}) {
  const add = useCartStore((s) => s.add);
  const [pickerOpen, setPickerOpen] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const multiSize = product.sizes.length > 1;

  // Dismiss the size picker on Escape or an outside click (in addition to
  // re-clicking the trigger or selecting a size).
  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (imageRef.current && !imageRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [pickerOpen]);

  const addToBag = (size: string) => {
    add(product, product.colors[0]?.name ?? "", size, 1);
    toast("Added to bag");
    setPickerOpen(false);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
    // Single-size products add in one click; otherwise reveal the size picker.
    if (multiSize) {
      setPickerOpen((open) => !open);
      return;
    }
    addToBag(product.sizes[0] ?? "");
  };

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
    >
      <div ref={imageRef} className="dc-stripe relative aspect-4/5 overflow-hidden">
        <CardCover product={product} />
        {soldOut ? (
          <span className="absolute top-3 left-3 bg-ink/85 px-2.5 py-1 text-[9.5px] tracking-[0.16em] uppercase text-white">
            Sold out
          </span>
        ) : null}
        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={soldOut}
          aria-disabled={soldOut}
          aria-expanded={multiSize && !soldOut ? pickerOpen : undefined}
          aria-label={
            soldOut
              ? `${product.name} is sold out`
              : multiSize
                ? pickerOpen
                  ? `Close size picker for ${product.name}`
                  : `Choose a size for ${product.name}`
                : `Quick add ${product.name} to bag`
          }
          title={soldOut ? "Sold out" : multiSize ? "Choose a size" : "Quick add"}
          className={`absolute right-3 bottom-3 z-20 flex size-11 items-center justify-center rounded-full bg-foam text-ink shadow-[0_4px_14px_rgba(42,38,32,0.16)] transition-colors hover:bg-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:cursor-not-allowed disabled:bg-foam disabled:text-ink/40 disabled:shadow-none disabled:hover:bg-foam disabled:hover:text-ink/40 ${
            pickerOpen ? "bg-teal text-white" : ""
          }`}
        >
          <Plus
            className={`size-[18px] transition-transform ${pickerOpen ? "rotate-45" : ""}`}
            strokeWidth={1.6}
          />
        </button>

        {pickerOpen && !soldOut ? (
          // Anchored above the trigger (bottom-14) so the "×" stays clickable.
          <div
            onClick={stop}
            className="absolute inset-x-0 bottom-14 z-10 flex flex-wrap items-center justify-center gap-2 bg-cream/95 px-3 py-3.5 shadow-[0_-4px_14px_rgba(42,38,32,0.12)]"
          >
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={(e) => {
                  stop(e);
                  addToBag(s);
                }}
                aria-label={`Add ${product.name}, size ${s}, to bag`}
                className={sizePillClass()}
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-[7px] pt-4">
        <span className="text-[10.5px] tracking-[0.2em] uppercase text-clay">
          {CATEGORY_LABELS[product.category]}
        </span>
        <span className="font-serif text-[19px] text-teal">{product.name}</span>
        <div className="mt-0.5 flex items-center justify-between">
          <span className="text-[15px] text-[#5A5247]">
            {formatPrice(product.price, product.currency)}
          </span>
          <div className="flex gap-1.5">
            {product.colors.map((color) => (
              <span
                key={color.name}
                title={color.name}
                className="size-3 rounded-full border border-ink/12"
                style={{ background: color.hex }}
              />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
