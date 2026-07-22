"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { IHomeContent } from "@/features/catalog/server/home";
import type { ICatalogProduct } from "@/features/catalog/types";

interface IEditorialSplitProps {
  content: IHomeContent;
  /** Tee products used as gallery slides. */
  tees: ICatalogProduct[];
}

/**
 * Tee gallery with navigation arrows. Slides use the tee product images as
 * placeholders — swap in real lifestyle photography once it exists.
 */
export function EditorialSplit({ content, tees }: IEditorialSplitProps) {
  const slides = tees.length > 0 ? tees : [];
  const [index, setIndex] = useState(0);

  const hasSlides = slides.length > 0;
  const active = hasSlides ? slides[index % slides.length] : undefined;
  const cover = active?.images[0];

  const go = (delta: number) => {
    if (slides.length === 0) return;
    setIndex((i) => (i + delta + slides.length) % slides.length);
  };

  return (
    <section className="grid min-h-[560px] grid-cols-1 bg-sand lg:grid-cols-[1.05fr_1fr]">
      <div className="relative min-h-[360px] overflow-hidden bg-[#3A352E]">
        {cover ? (
          <Image
            src={cover.url}
            alt={cover.alt}
            fill
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="object-cover"
          />
        ) : active ? (
          <div className="dc-stripe absolute inset-0 flex items-center justify-center px-8 text-center">
            <span className="font-serif text-[30px] text-[#C4B79C]">
              {active.name}
            </span>
          </div>
        ) : content.editorialImage ? (
          <Image
            src={content.editorialImage}
            alt={content.editorialHeading}
            fill
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="dc-stripe absolute inset-0" />
        )}

        {slides.length > 1 ? (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-5">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous tee"
              className="flex size-11 items-center justify-center rounded-full bg-cream/90 text-ink shadow-[0_4px_14px_rgba(42,38,32,0.18)] transition-colors hover:bg-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foam"
            >
              <ChevronLeft className="size-5" strokeWidth={1.6} />
            </button>
            <span
              className="text-[11px] tracking-[0.18em] uppercase text-cream/80"
              aria-hidden
            >
              {(index % slides.length) + 1} / {slides.length}
            </span>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next tee"
              className="flex size-11 items-center justify-center rounded-full bg-cream/90 text-ink shadow-[0_4px_14px_rgba(42,38,32,0.18)] transition-colors hover:bg-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foam"
            >
              <ChevronRight className="size-5" strokeWidth={1.6} />
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col justify-center px-8 py-[84px] sm:px-[72px]">
        <span className="text-xs tracking-[0.32em] uppercase text-teal">
          {content.editorialEyebrow}
        </span>
        <h2 className="mt-[18px] max-w-[420px] font-serif text-[32px] leading-[1.12] text-balance text-teal sm:text-[40px]">
          {content.editorialHeading}
        </h2>
        {active ? (
          <p
            className="mt-6 text-[13px] tracking-[0.18em] uppercase text-clay"
            aria-live="polite"
          >
            {active.name}
          </p>
        ) : null}
        {/* Native anchor (not next/link): same-page jump to the shop grid.
            App Router <Link> won't re-scroll when the hash is already
            #shop-grid, so a plain <a> is used for reliable anchor scrolling. */}
        <a
          href="#shop-grid"
          className="mt-[34px] self-start rounded-full border border-teal bg-teal px-8 py-4 text-[12px] tracking-[0.18em] uppercase text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        >
          {content.editorialCta}
        </a>
      </div>
    </section>
  );
}
