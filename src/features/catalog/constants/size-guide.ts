/**
 * Static apparel (tee) size guide. Measurements are in inches.
 *
 * Structured as a typed row list so it can be lifted into Contentful later
 * without changing the consuming component's shape.
 */
export interface ISizeGuideRow {
  size: string;
  length: string;
  width: string;
  sleeve: string;
}

export const SIZE_GUIDE_COLUMNS = [
  "Size",
  "Length",
  "Width",
  "Sleeve",
] as const;

export const TEE_SIZE_GUIDE: ISizeGuideRow[] = [
  { size: "S", length: '23"', width: '20"', sleeve: '9"' },
  { size: "M", length: '24"', width: '21"', sleeve: '9.5"' },
  { size: "L", length: '25"', width: '22"', sleeve: '10"' },
  { size: "XL", length: '26"', width: '23"', sleeve: '10.5"' },
  { size: "2XL", length: '27"', width: '24"', sleeve: '11"' },
];
