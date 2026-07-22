import type { ReactNode } from "react";
import type { IHomeContent } from "@/features/catalog/server/home";

interface IAssurancesProps {
  content: IHomeContent;
}

/**
 * Decorative icons, paired with assurance copy by position. Copy comes from
 * Contentful (with design defaults); icons stay part of the design system.
 */
const ICONS: ReactNode[] = [
  <path key="bolt" d="M13 2 4 14h6l-1 8 9-12h-6z" />,
  <g key="leaf">
    <path d="M4 20c0-7 5-13 16-14C19 13 13 20 5 20" />
    <path d="M4 20 14 10" />
  </g>,
  <g key="truck">
    <path d="M2 6h11v9H2z" />
    <path d="M13 9h4l4 3v3h-8z" />
    <circle cx="7" cy="18" r="1.6" />
    <circle cx="17.5" cy="18" r="1.6" />
  </g>,
  <g key="shield">
    <path d="M12 2.5 5 5v6c0 4.5 3 8 7 9.5 4-1.5 7-5 7-9.5V5z" />
    <path d="M9 12l2 2 4-4" />
  </g>,
];

export function Assurances({ content }: IAssurancesProps) {
  return (
    <section className="bg-teal px-6 py-[62px] sm:px-14">
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {content.assurances.map((item, index) => (
          <div key={item.title} className="flex flex-col gap-[18px]">
            <span className="flex size-[54px] items-center justify-center rounded-full border border-shell/55 text-shell">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
                strokeLinecap="round"
                aria-hidden
              >
                {ICONS[index % ICONS.length]}
              </svg>
            </span>
            <span className="text-base font-medium text-[#EBE1CC]">
              {item.title}
            </span>
            <p className="text-sm leading-[1.65] font-normal text-sage">
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
