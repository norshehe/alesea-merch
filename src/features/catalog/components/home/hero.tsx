import Image from "next/image";
import Link from "next/link";
import type { IHomeContent } from "@/features/catalog/server/home";

interface IHeroProps {
  content: IHomeContent;
}

export function Hero({ content }: IHeroProps) {
  return (
    <section className="relative h-[90vh] max-h-[880px] min-h-[600px] w-full overflow-hidden bg-[#3A352E]">
      {content.heroImage ? (
        <Image
          src={content.heroImage}
          alt={content.heroHeading}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        <div className="dc-stripe absolute inset-0" />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg,rgba(28,24,18,0.28) 0%,rgba(28,24,18,0.12) 38%,rgba(28,24,18,0.62) 100%)",
        }}
      />
      <div className="absolute inset-0 flex flex-col justify-end px-6 pb-[76px] sm:px-14">
        <span className="mb-[22px] text-xs tracking-[0.4em] uppercase text-[#E9DFCD]">
          {content.heroEyebrow}
        </span>
        <h1 className="max-w-[780px] font-serif text-[44px] leading-[0.98] text-balance text-foam sm:text-[64px] lg:text-[84px]">
          {content.heroHeading}
        </h1>
        <p className="mt-6 max-w-[430px] text-[17px] leading-relaxed font-light text-[#EDE6D8]">
          {content.heroBody}
        </p>
        <div className="mt-[34px] flex flex-wrap gap-3.5">
          <Link
            href="/#shop-grid"
            className="rounded-full border border-teal bg-teal px-8 py-4 text-[12px] tracking-[0.18em] uppercase text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foam"
          >
            {content.heroPrimaryCta}
          </Link>
          <Link
            href="/#shop-grid"
            className="rounded-full border border-foam/70 bg-transparent px-8 py-4 text-[12px] tracking-[0.18em] uppercase text-foam transition hover:bg-foam hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foam"
          >
            {content.heroSecondaryCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
