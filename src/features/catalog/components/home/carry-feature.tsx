import Image from "next/image";
import { EmailSignupForm } from "@/features/catalog/components/email-signup-form";
import type { IHomeContent } from "@/features/catalog/server/home";

interface ICarryFeatureProps {
  content: IHomeContent;
}

export function CarryFeature({ content }: ICarryFeatureProps) {
  return (
    <section className="px-6 pt-24 pb-[88px] sm:px-14">
      <div className="grid grid-cols-1 items-center gap-[72px] lg:grid-cols-2">
        <div className="relative pt-11 pl-11">
          <div className="absolute top-0 left-0 h-[82%] w-[78%] rounded-[120px_6px_6px_6px] border border-shell" />
          <div className="dc-stripe relative aspect-[1.18/1] overflow-hidden rounded-[110px_6px_90px_6px] bg-sand shadow-[0_24px_60px_rgba(42,38,32,0.14)]">
            {content.carryImage ? (
              <Image
                src={content.carryImage}
                alt={content.carryHeading}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-[#B6A988]">
                  Drop Carry photo
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="max-w-[440px]">
          <span className="text-xs tracking-[0.32em] uppercase text-teal">
            {content.carryEyebrow}
          </span>
          <h2 className="mt-3.5 font-serif text-[36px] leading-[1.05] text-teal sm:text-[44px]">
            {content.carryHeading}
          </h2>
          <p className="mt-[22px] text-base leading-[1.7] font-normal text-stone-deep">
            {content.carryBody}
          </p>
          {/* Tote teaser: capture emails for the coming-soon Weekender Tote. */}
          <EmailSignupForm
            source="weekender-tote-teaser"
            className="mt-8 max-w-[400px]"
          />
        </div>
      </div>
    </section>
  );
}
