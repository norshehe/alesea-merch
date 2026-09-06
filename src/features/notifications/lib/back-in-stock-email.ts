import type { ICatalogProduct } from "@/features/catalog/types";
import { formatPrice } from "@/lib/format";

/** Escape interpolated values so a product name can never inject markup. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build the back-in-stock email for a product.
 *
 * Inline styles only, table-free, single column — the usual constraints for mail
 * clients. Copy is intentionally short: the job of this email is one click
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
    "— Alesea Lifestyle, La Union",
  ].join("\n");

  const html = `
<div style="margin:0;padding:32px 16px;background:#f6f1eb;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#fbf8f2;padding:40px 32px;">
    <p style="margin:0 0 22px;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#084e50;">
      Alesea Lifestyle
    </p>
    <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;font-weight:400;color:#084e50;">
      ${escapeHtml(product.name)} just landed.
    </h1>
    <p style="margin:0 0 26px;font-size:15px;line-height:1.7;color:#6b6256;">
      You asked us to let you know when it arrived — it's in stock now at
      ${escapeHtml(price)}.
    </p>
    <a href="${escapeHtml(url)}"
       style="display:inline-block;padding:15px 32px;background:#084e50;color:#ffffff;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;border-radius:999px;">
      Shop it now
    </a>
    <p style="margin:32px 0 0;font-size:12px;line-height:1.7;color:#9a8c73;">
      You're getting this because you signed up for a restock alert on
      alesea.co. It's a one-off — we won't email you again about this item.
    </p>
  </div>
</div>`.trim();

  return { subject, text, html };
}
