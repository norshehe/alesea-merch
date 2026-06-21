import Image from "next/image";
import Link from "next/link";
import type { IHomeContent } from "@/features/catalog/server/home";

interface IEditorialSplitProps {
  content: IHomeContent;
}

export function EditorialSplit({ content }: IEditorialSplitProps) {
  return (
    <section className="grid min-h-[560px] grid-cols-1 bg-sand lg:grid-cols-[1.05fr_1fr]">
      <div className="relative min-h-[360px] overflow-hidden bg-[#3A352E]">
        {content.editorialImage ? (
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
      </div>
      <div className="flex flex-col justify-center px-8 py-[84px] sm:px-[72px]">
        <span className="text-xs tracking-[0.32em] uppercase text-teal">
          {content.editorialEyebrow}
        </span>
        <h2 className="mt-[18px] max-w-[420px] font-serif text-[32px] leading-[1.12] text-balance text-teal sm:text-[40px]">
          {content.editorialHeading}
        </h2>
        <p className="mt-5 max-w-[440px] text-base leading-[1.7] font-light text-stone-deep">
          {content.editorialBody}
        </p>
        <p className="mt-10 max-w-[430px] font-serif text-[23px] leading-[1.4] italic text-teal">
          {content.editorialQuote}
        </p>
        <Link
          href="/#shop-grid"
          className="mt-[34px] self-start rounded-full border border-teal bg-teal px-8 py-4 text-[12px] tracking-[0.18em] uppercase text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        >
          {content.editorialCta}
        </Link>
      </div>
    </section>
  );
}
