import Image from "next/image";
import Link from "next/link";
import { ImageOff, Package, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/features/admin/components/empty-state";
import { PageHeader } from "@/features/admin/components/page-header";
import { ProductReorderButtons } from "@/features/admin/products/components/product-reorder-buttons";
import { ProductStatusToggle } from "@/features/admin/products/components/product-status-toggle";
import {
  listAdminProducts,
  type IProductStockSummary,
} from "@/features/admin/products/server/product.queries";
import { CATEGORY_LABELS } from "@/features/catalog/constants/products";
import { formatPrice } from "@/lib/format";

/**
 * Inventory is deliberately sparse — no rows means "unknown", never "zero".
 *
 * ⚠️ Three states, not two. "Not tracked" is a LOAD-BEARING claim in this app:
 * it means the storefront will treat every variant as in stock and the
 * back-in-stock job will skip them. Rendering it because the inventory query
 * FAILED would tell the operator something specific and false about their
 * catalogue, so a null roll-up says so instead.
 */
function StockCell({ stock }: { stock: IProductStockSummary | null }) {
  if (stock === null) {
    return <span className="text-muted-foreground italic">Stock unavailable</span>;
  }
  if (stock.tracked === 0) {
    return <span className="text-muted-foreground">Not tracked</span>;
  }
  return (
    <span className="flex items-center gap-2">
      <span className="tabular-nums">{stock.units} in stock</span>
      {stock.outOfStock > 0 ? (
        <Badge variant="destructive">{stock.outOfStock} out</Badge>
      ) : null}
    </span>
  );
}

export default async function AdminProductsPage() {
  const products = await listAdminProducts();

  return (
    <>
      <PageHeader
        title="Products"
        description="Create, edit and publish products."
        actions={
          <Button render={<Link href="/admin/products/new" />}>
            <Plus aria-hidden="true" />
            New product
          </Button>
        }
      />

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add your first product and it will appear on the storefront once published."
          action={
            <Button render={<Link href="/admin/products/new" />}>
              <Plus aria-hidden="true" />
              New product
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">
                  <span className="sr-only">Image</span>
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>
                  <span className="sr-only">Order</span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product, index) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.image ? (
                      <Image
                        src={product.image.url}
                        alt={product.image.alt}
                        width={40}
                        height={40}
                        className="bg-muted size-10 rounded-md object-cover"
                      />
                    ) : (
                      <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-md">
                        <ImageOff className="size-4" aria-hidden="true" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="grid">
                      <span className="font-medium">{product.title}</span>
                      <span className="text-muted-foreground text-xs">
                        /{product.slug}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>{CATEGORY_LABELS[product.category]}</TableCell>
                  <TableCell className="tabular-nums">
                    {/* Per-product currency — never a hardcoded symbol. */}
                    {product.comingSoon && product.price === 0
                      ? "—"
                      : formatPrice(product.price, product.currency)}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      <Badge
                        variant={
                          product.status === "published" ? "default" : "outline"
                        }
                      >
                        {product.status === "published" ? "Published" : "Draft"}
                      </Badge>
                      {product.comingSoon ? (
                        <Badge variant="secondary">Coming soon</Badge>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StockCell stock={product.stock} />
                  </TableCell>
                  <TableCell>
                    <ProductReorderButtons
                      id={product.id}
                      title={product.title}
                      isFirst={index === 0}
                      isLast={index === products.length - 1}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex items-center justify-end gap-1">
                      <ProductStatusToggle
                        id={product.id}
                        title={product.title}
                        status={product.status}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        render={<Link href={`/admin/products/${product.id}`} />}
                      >
                        Edit
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
