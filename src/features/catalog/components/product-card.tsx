"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cart.store";
import { CATEGORY_LABELS } from "@/features/catalog/constants/products";
import type { ICatalogProduct } from "@/features/catalog/types";
import { formatPrice } from "@/lib/format";

interface IProductCardProps {
  product: ICatalogProduct;
  /** True when every variant is out of stock — disables quick-add, shows a label. */
  soldOut?: boolean;
}

export function ProductCard({ product, soldOut = false }: IProductCardProps) {
  const add = useCartStore((s) => s.add);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
    add(product, product.colors[0]?.name ?? "", product.sizes[0] ?? "", 1);
    toast("Added to bag");
  };

  const shotLabel = `${product.category.toUpperCase()} / FRONT`;
  const cover = product.images[0];

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
    >
      <div className="dc-stripe relative aspect-4/5 overflow-hidden">
        {cover ? (
          <Image
            src={cover.url}
            alt={cover.alt}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[9px] px-5 text-center">
            <span className="font-serif text-[22px] leading-tight text-[#C4B79C]">
              {product.name}
            </span>
            <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-[#B6A988]">
              {shotLabel}
            </span>
          </div>
        )}
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
          aria-label={
            soldOut
              ? `${product.name} is sold out`
              : `Quick add ${product.name} to bag`
          }
          title={soldOut ? "Sold out" : "Quick add"}
          className="absolute right-3 bottom-3 flex size-[42px] items-center justify-center rounded-full bg-foam text-ink shadow-[0_4px_14px_rgba(42,38,32,0.16)] transition-colors hover:bg-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:cursor-not-allowed disabled:bg-foam disabled:text-ink/40 disabled:shadow-none disabled:hover:bg-foam disabled:hover:text-ink/40"
        >
          <Plus className="size-[18px]" strokeWidth={1.6} />
        </button>
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
