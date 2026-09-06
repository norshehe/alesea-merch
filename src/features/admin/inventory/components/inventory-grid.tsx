"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/features/admin/components/submit-button";
import {
  deleteOrphanRow,
  saveInventory,
} from "@/features/admin/inventory/server/inventory.actions";
import type { InventoryCell } from "@/features/admin/inventory/schemas/inventory.schema";
import type {
  IInventoryProduct,
  IInventoryRow,
} from "@/features/admin/inventory/server/inventory.queries";
import type { IInventoryOrphan } from "@/features/admin/products/server/product.queries";
import {
  LOW_STOCK_THRESHOLD,
  stockStatus,
  variantKey,
} from "@/features/catalog/lib/stock";
import { cn } from "@/lib/utils";

interface IInventoryGridProps {
  /** Every product, drafts included, in admin list order. */
  products: IInventoryProduct[];
  /** The product currently being edited. */
  product: IInventoryProduct;
  /** The rows that EXIST for that product. Sparse on purpose. */
  rows: IInventoryRow[];
  /** Stock rows whose colour/size the product no longer declares. */
  orphans: IInventoryOrphan[];
}

/** What one edited cell parses to. `null` stock means "delete the row". */
interface IParsedCell {
  stock: number | null;
  /** Set when the text cannot become a stock value; blocks Save. */
  error: string | null;
}

/**
 * Parse the text in a cell.
 *
 * Empty is NOT zero — it is "stop tracking this variant", which the action
 * turns into a DELETE. That restores "unknown", which the storefront reads as
 * in stock and the back-in-stock job reads as do-not-email.
 */
function parseCell(text: string): IParsedCell {
  const trimmed = text.trim();
  if (trimmed === "") return { stock: null, error: null };

  const value = Number(trimmed);
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return { stock: null, error: "Whole numbers only." };
  }
  // Caught here rather than by the `stock >= 0` CHECK, so the operator sees a
  // sentence next to the box instead of a failed save.
  if (value < 0) return { stock: null, error: "Cannot be negative." };

  return { stock: value, error: null };
}

/** `undefined` (no row / cleared) is UNKNOWN, which reads as in stock. */
function cellClassName(stock: number | undefined): string {
  if (stock === undefined) return "";
  const status = stockStatus(stock);
  if (status === "out") return "text-destructive font-medium";
  if (status === "low") return "ring-3 ring-amber-500/30 border-amber-500";
  return "";
}

export function InventoryGrid({
  products,
  product,
  rows,
  orphans,
}: IInventoryGridProps) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();

  /**
   * ONLY the edited cells, keyed by `variantKey()`. Seeding this with every
   * cell would make "unchanged" and "explicitly typed" indistinguishable, and
   * a save would then write a row for every variant.
   */
  const [dirty, setDirty] = useState<Map<string, string>>(new Map());

  // Base UI Select is not a native input — it must be driven by a Controller.
  const { control, setValue } = useForm<{ productId: string }>({
    defaultValues: { productId: product.id },
  });

  const existing = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(variantKey(product.slug, row.color, row.size), row.stock);
    }
    return map;
  }, [rows, product.slug]);

  /**
   * An empty axis collapses to a single `""` entry, producing the key
   * `slug||` — exactly what `variantKey()` builds for a variant-less product
   * (the Weekender Tote). Do not "fix" this into a special case.
   */
  const colorNames = useMemo(
    () =>
      product.colors.length > 0 ? product.colors.map((c) => c.name) : [""],
    [product.colors],
  );
  const sizeNames = useMemo(
    () => (product.sizes.length > 0 ? product.sizes : [""]),
    [product.sizes],
  );

  const hasChanges = dirty.size > 0;
  const invalidCount = useMemo(() => {
    let count = 0;
    for (const text of dirty.values()) {
      if (parseCell(text).error) count += 1;
    }
    return count;
  }, [dirty]);

  // A grid save is a deliberate act; losing it to a stray tab close is not.
  useEffect(() => {
    if (!hasChanges) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasChanges]);

  function setCell(key: string, text: string) {
    setDirty((previous) => {
      const next = new Map(previous);
      next.set(key, text);
      return next;
    });
  }

  function changeProduct(nextId: string) {
    if (nextId === product.id) return;
    if (
      hasChanges &&
      !window.confirm(
        "You have unsaved stock changes. Switching products will discard them.",
      )
    ) {
      // Leave the Select showing the product still on screen.
      return;
    }
    setDirty(new Map());
    setValue("productId", nextId);
    router.push(`/admin/inventory?product=${nextId}`);
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges || invalidCount > 0 || isSaving) return;

    // Rebuild colour/size from the axes rather than splitting the key: a colour
    // named "Sand|Teal" would make the key ambiguous, the axes never are.
    const cells: InventoryCell[] = [];
    for (const color of colorNames) {
      for (const size of sizeNames) {
        const text = dirty.get(variantKey(product.slug, color, size));
        if (text === undefined) continue;
        const parsed = parseCell(text);
        if (parsed.error) continue;
        cells.push({ color, size, stock: parsed.stock });
      }
    }

    if (cells.length === 0) return;

    startSaving(async () => {
      const result = await saveInventory(product.id, cells);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const parts: string[] = [];
      if (result.updated > 0) parts.push(`${result.updated} updated`);
      if (result.cleared > 0) parts.push(`${result.cleared} no longer tracked`);
      toast.success(`Stock saved — ${parts.join(", ")}.`);

      setDirty(new Map());
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      {/* The orphan section stays OUTSIDE this form: its AlertDialog buttons
          would otherwise submit the grid. */}
      <form onSubmit={save} className="grid gap-6" noValidate>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-2">
            <Label htmlFor="product">Product</Label>
            <Controller
              control={control}
              name="productId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  // Base UI types the value as nullable; the Select is never
                  // cleared here, so a null is simply ignored.
                  onValueChange={(value) => {
                    if (value !== null) changeProduct(value);
                  }}
                >
                  <SelectTrigger
                    id="product"
                    className="w-72"
                    disabled={isSaving}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.title}
                        {option.status === "draft" ? " (draft)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex items-center gap-3">
            {hasChanges ? (
              <span className="text-muted-foreground text-sm">
                {dirty.size} unsaved change{dirty.size === 1 ? "" : "s"}
              </span>
            ) : null}
            {/* One explicit Save. Autosave here would be a round trip per
              keystroke, racing the revalidation of the storefront pages. */}
            <SubmitButton
              pending={isSaving}
              pendingLabel="Saving…"
              size="default"
              disabled={!hasChanges || invalidCount > 0}
            >
              Save changes
            </SubmitButton>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                  Colour
                </th>
                {sizeNames.map((size) => (
                  <th
                    key={size}
                    className="text-muted-foreground px-3 py-2 text-left font-medium"
                  >
                    {/* No size axis ⇒ a single unnamed column. */}
                    {size === "" ? (
                      <span aria-label="No size options">—</span>
                    ) : (
                      size
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {colorNames.map((color) => (
                <tr key={color} className="border-b last:border-b-0">
                  <th
                    scope="row"
                    className="px-3 py-2 text-left font-medium whitespace-nowrap"
                  >
                    {color === "" ? (
                      <span
                        className="text-muted-foreground"
                        aria-label="No colour options"
                      >
                        —
                      </span>
                    ) : (
                      color
                    )}
                  </th>
                  {sizeNames.map((size) => {
                    const key = variantKey(product.slug, color, size);
                    const text =
                      dirty.get(key) ?? existing.get(key)?.toString() ?? "";
                    const parsed = parseCell(text);
                    const label = `Stock for ${color || "no colour"}, ${size || "no size"}`;

                    return (
                      <td key={size} className="px-3 py-2 align-top">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          aria-label={label}
                          aria-invalid={parsed.error ? true : undefined}
                          // Blank must not look like zero — it reads "in stock".
                          placeholder="in stock"
                          disabled={isSaving}
                          value={text}
                          onChange={(event) => setCell(key, event.target.value)}
                          className={cn(
                            "w-24 tabular-nums",
                            parsed.error
                              ? undefined
                              : cellClassName(parsed.stock ?? undefined),
                            dirty.has(key) && !parsed.error
                              ? "border-ring"
                              : undefined,
                          )}
                        />
                        {parsed.error ? (
                          <p className="text-destructive mt-1 text-xs">
                            {parsed.error}
                          </p>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* The rules, stated where they are applied. */}
        <ul className="text-muted-foreground grid gap-1 text-xs">
          <li>
            <span className="text-foreground font-medium">Blank</span> — not
            tracked. The shop treats it as in stock and the back-in-stock emails
            skip it. Clearing a box deletes its row.
          </li>
          <li>
            <span className="text-destructive font-medium">0</span> — sold out.
            This is a real row, and the shop blocks the sale.
          </li>
          <li>
            <span className="text-foreground font-medium">
              1–{LOW_STOCK_THRESHOLD}
            </span>{" "}
            — low stock, highlighted in amber.
          </li>
        </ul>
      </form>

      {orphans.length > 0 ? (
        <section className="border-destructive/40 bg-destructive/5 grid gap-3 rounded-lg border p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="text-destructive mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <div className="grid gap-1">
              <h2 className="text-sm font-semibold">
                {orphans.length} stranded stock row
                {orphans.length === 1 ? "" : "s"}
              </h2>
              <p className="text-muted-foreground text-xs">
                These rows name a colour or size {product.title} no longer
                offers — usually the leftovers of a rename — so nothing reads
                them and the stock they hold is invisible to the shop.
              </p>
            </div>
          </div>

          <ul className="grid gap-2">
            {orphans.map((orphan) => (
              <li
                key={orphan.id}
                className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    {orphan.color || "—"} / {orphan.size || "—"}
                  </span>
                  <Badge variant="outline">{orphan.stock} in stock</Badge>
                </span>
                <OrphanRemoveButton orphan={orphan} />
              </li>
            ))}
          </ul>

          <p className="text-muted-foreground text-xs">
            To keep the stock instead, re-add that option on the{" "}
            <Link
              href={`/admin/products/${product.id}`}
              className="underline underline-offset-4"
            >
              product
            </Link>{" "}
            and the row reconnects on its own.
          </p>
        </section>
      ) : null}
    </div>
  );
}

/** Removing a stranded row is destructive and unrecoverable — confirm it. */
function OrphanRemoveButton({ orphan }: { orphan: IInventoryOrphan }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const label = `${orphan.color || "—"} / ${orphan.size || "—"}`;

  function confirm() {
    startTransition(async () => {
      const result = await deleteOrphanRow(orphan.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      toast.success(`Removed ${label}.`);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        <Trash2 aria-hidden="true" />
        Remove row
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the stock row for good. Nothing currently reads it, so
            the shop will not change — but the {orphan.stock} units it records
            are gone from the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={confirm}
          >
            {isPending ? "Removing…" : "Remove row"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
