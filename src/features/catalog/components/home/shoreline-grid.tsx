import type { IHomeContent } from "@/features/catalog/server/home";

const TILES = [1, 2, 3, 4, 5, 6];

interface IShorelineGridProps {
  content: IHomeContent;
}

export function ShorelineGrid({ content }: IShorelineGridProps) {
  return (
    <section className="px-6 pt-2 pb-24 sm:px-14">
      <div className="mb-[34px] flex flex-wrap items-end justify-between gap-7">
        <div>
          <span className="text-xs tracking-[0.26em] uppercase text-teal">
            {content.shorelineHandle}
          </span>
          <h2 className="mt-3 font-serif text-[34px] leading-[1.04] text-teal sm:text-[46px]">
            {content.shorelineHeading}
          </h2>
        </div>
        <p className="max-w-[300px] text-[15px] leading-[1.65] font-light text-stone sm:text-right">
          {content.shorelineBody}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-[18px] sm:grid-cols-6">
        {TILES.map((tile) => (
          <div
            key={tile}
            className="dc-stripe flex aspect-[1/1.04] items-center justify-center rounded-[4px]"
          >
            <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-[#B6A988]">
              @ tag
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
