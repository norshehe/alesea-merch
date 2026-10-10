import type { ICatalogProduct } from "@/features/catalog/types";
import { formatPrice } from "@/lib/format";
import {
  EMAIL_SIGN_OFF,
  EMAIL_STYLE,
  emailButton,
  emailParagraph,
  emailShell,
} from "@/lib/email/shell";

/**
 * Build the back-in-stock email for a product.
 *
 * Built on the shared `emailShell` (`@/lib/email/shell`). Copy is intentionally short: the job of this email is one click
 * through to the product page.
 */
export function buildBackInStockEmail(
  product: ICatalogProduct,
  siteUrl: string,
): { subject: string; text: string; html: string } {
  const url = `${siteUrl.replace(/\/$/, "")}/products/${product.slug}`;
  const price = formatPrice(product.price, product.currency);

  const subject = `${product.name} just landed`;

  const text = [
    `${product.name} is here.`,
    "",
    `You asked us to let you know when it landed — it's in stock now at ${price}.`,
    "",
    `Shop it: ${url}`,
    "",
    EMAIL_SIGN_OFF,
  ].join("\n");

  const html = emailShell(
    `${product.name} just landed.`,
    [
      emailParagraph(
        `You asked us to let you know when it arrived — it's in stock now at ${price}.`,
        `${EMAIL_STYLE.body}margin-bottom:26px;`,
      ),
      emailButton(url, "Shop it now"),
      emailParagraph(
        "You're getting this because you signed up for a restock alert on alesea.co. It's a one-off — we won't email you again about this item.",
        `${EMAIL_STYLE.small}margin-top:32px;`,
      ),
    ].join("\n    "),
    { title: subject },
  );

  return { subject, text, html };
}
