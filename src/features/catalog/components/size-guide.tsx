import {
  SIZE_GUIDE_COLUMNS,
  TEE_SIZE_GUIDE,
} from "@/features/catalog/constants/size-guide";

/**
 * Apparel size guide table for tee products. Static, server-rendered.
 * Measurements are length/width/sleeve in inches.
 */
export function SizeGuide() {
  return (
    <section className="mt-[88px]">
      <h2 className="mb-7 font-serif text-[22px] text-teal sm:text-2xl">
        Size guide
      </h2>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[420px] border-collapse text-left">
          <thead>
            <tr className="bg-teal text-white">
              {SIZE_GUIDE_COLUMNS.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="px-5 py-3 text-[13px] font-medium tracking-wide"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TEE_SIZE_GUIDE.map((row, index) => (
              <tr
                key={row.size}
                className={index > 0 ? "border-t border-line" : undefined}
              >
                <td className="bg-cream px-5 py-3 text-[14px] font-medium text-ink">
                  {row.size}
                </td>
                <td className="px-5 py-3 text-[14px] text-stone">
                  {row.length}
                </td>
                <td className="px-5 py-3 text-[14px] text-stone">
                  {row.width}
                </td>
                <td className="px-5 py-3 text-[14px] text-stone">
                  {row.sleeve}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
