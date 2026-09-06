"use client";

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
  /** Sizes that are out of stock in every colour — rendered as disabled pills. */
  soldOutSizes?: string[];
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

export function ProductCard({
  product,
  soldOut = false,
  soldOutSizes = [],
}: IProductCardProps) {
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

  return (
    <ActiveProductCard
      product={product}
      soldOut={soldOut}
      soldOutSizes={soldOutSizes}
    />
  );
}

/**
 * Purchasable card.
 *
 * Multi-size products show their size row up-front (tapping a size adds it to
 * the bag) — customers were not discovering sizes when they were hidden behind
 * the quick-add button. Single-size products keep the one-tap "+" overlay
 * instead, since a row of one pill carries no information.
 *
 * Not a full-card <Link>: the size pills are buttons, and buttons cannot be
 * nested inside an anchor. The image and the name are the links to the PDP.
 */
function ActiveProductCard({
  product,
  soldOut,
  soldOutSizes,
}: {
  product: ICatalogProduct;
  soldOut: boolean;
  soldOutSizes: string[];
}) {
  const add = useCartStore((s) => s.add);
  const multiSize = product.sizes.length > 1;

  const addToBag = (size: string) => {
    add(product, product.colors[0]?.name ?? "", size, 1);
    toast("Added to bag");
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
    addToBag(product.sizes[0] ?? "");
  };

  return (
    <div className="flex flex-col">
      {/* The link fills the image box; the quick-add button is a sibling laid
          over it, so the button is never nested inside the anchor. */}
      <div className="dc-stripe relative aspect-4/5 overflow-hidden">
        <Link
          href={`/products/${product.slug}`}
          className="group absolute inset-0 z-10 rounded-[2px] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-teal"
          aria-label={product.name}
        >
          <CardCover product={product} />
        </Link>
        {soldOut ? (
          <span className="pointer-events-none absolute top-3 left-3 z-20 bg-ink/85 px-2.5 py-1 text-[9.5px] tracking-[0.16em] uppercase text-white">
            Sold out
          </span>
        ) : null}
        {/* Single-size products keep the one-tap quick-add over the image. */}
        {!multiSize ? (
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={soldOut}
            aria-disabled={soldOut}
            aria-label={
              soldOut
                ? `${product.name} is sold out`
                : `Quick add ${product.name} to bag`
            }
            title={soldOut ? "Sold out" : "Quick add"}
            className="absolute right-3 bottom-3 z-20 flex size-11 items-center justify-center rounded-full bg-foam text-ink shadow-[0_4px_14px_rgba(42,38,32,0.16)] transition-colors hover:bg-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:cursor-not-allowed disabled:bg-foam disabled:text-ink/40 disabled:shadow-none disabled:hover:bg-foam disabled:hover:text-ink/40"
          >
            <Plus className="size-[18px]" strokeWidth={1.6} />
          </button>
        ) : null}
      </div>

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

        {multiSize ? (
          <div className="mt-2.5">
            <span className="text-[10px] tracking-[0.18em] uppercase text-clay">
              {soldOut ? "Sold out" : `Select ${product.sizeLabel.toLowerCase()}`}
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {product.sizes.map((size) => {
                const out = soldOut || soldOutSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => addToBag(size)}
                    disabled={out}
                    aria-disabled={out}
                    aria-label={
                      out
                        ? `${product.name}, size ${size}, is sold out`
                        : `Add ${product.name}, size ${size}, to bag`
                    }
                    title={out ? `Size ${size} is sold out` : `Add size ${size}`}
                    className={`${sizePillClass({ out })} ${
                      out ? "cursor-not-allowed" : ""
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
