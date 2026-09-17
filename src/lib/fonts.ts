import { Montserrat, Playfair_Display } from "next/font/google";

/**
 * Shared font instances. Declared once so every root layout
 * (storefront and admin) loads the same faces without duplicating
 * `next/font` declarations, which would emit separate font payloads.
 */
export const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
