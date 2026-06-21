import Image from "next/image";
import Link from "next/link";
import type { IHomeContent } from "@/features/catalog/server/home";

interface IShopByCategoryProps {
  content: IHomeContent;
}

export function ShopByCategory({ content }: IShopByCategoryProps) {
  return (
    <section className="px-6 pt-[84px] pb-3 sm:px-14">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-8">
        <div>
          <span className="text-xs tracking-[0.32em] uppercase text-teal">
            {content.categoryEyebrow}
          </span>
          <h2 className="mt-3.5 max-w-[560px] font-serif text-[36px] leading-[1.04] text-balance text-teal sm:text-[50px]">
            {content.categoryHeading}
          </h2>
        </div>
        <p className="max-w-[330px] text-[15px] leading-[1.65] font-light text-stone sm:text-right">
          {content.categoryBody}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[26px] md:grid-cols-3">
        {content.categories.map((card) => (
          <Link
            key={card.id}
            href="/#shop-grid"
            className="group dc-stripe relative block min-h-[480px] overflow-hidden bg-sand"
          >
            {card.image ? (
              <Image
                src={card.image}
                alt={card.label}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-[#B6A988]">
                  Drop {card.label.toLowerCase()} shot
                </span>
              </div>
            )}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg,rgba(28,24,18,0) 38%,rgba(28,24,18,0.66) 100%)",
              }}
            />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-7">
              <span className="text-[10.5px] tracking-[0.24em] uppercase text-foam/[0.78]">
                {card.eyebrow}
              </span>
              <span className="font-serif text-[28px] text-foam">
                {card.label}
              </span>
              <span className="mt-2 inline-flex items-center gap-[9px] self-start border-b border-foam/50 pb-1 text-[11px] tracking-[0.18em] uppercase text-foam transition-all group-hover:gap-[13px] group-hover:border-white">
                Discover <span className="text-[13px]">→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
