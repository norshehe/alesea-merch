"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/features/admin/components/field";
import { SubmitButton } from "@/features/admin/components/submit-button";
import { TagInput } from "@/features/admin/components/tag-input";
import { ColorsField } from "@/features/admin/components/colors-field";
import { ImageUploadField } from "@/features/admin/components/image-upload-field";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  productSchema,
  slugify,
  type ProductFormValues,
  type ProductValues,
} from "@/features/admin/products/schemas/product.schema";
import { saveProduct } from "@/features/admin/products/server/product.actions";
import type { IAdminProduct } from "@/features/admin/products/server/product.queries";
import { CATEGORY_LABELS } from "@/features/catalog/constants/products";

interface IProductFormProps {
  /** `null` when creating. */
  product: IAdminProduct | null;
}

const STATUS_LABELS: Record<(typeof PRODUCT_STATUSES)[number], string> = {
  draft: "Draft",
  published: "Published",
};

interface IColorRowError {
  name?: { message?: string };
  hex?: { message?: string };
}

/**
 * RHF stores nested array errors in a shape TypeScript describes as a merge of
 * `FieldError` and an array, which cannot be indexed directly. Reading it
 * through `unknown` keeps the component honest without an `as unknown as` cast.
 */
function toColorErrors(
  value: unknown,
): ({ name?: string; hex?: string } | undefined)[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows: unknown[] = value;
  return rows.map((entry) => {
    if (typeof entry !== "object" || entry === null) return undefined;
    const row: IColorRowError = entry;
    return { name: row.name?.message, hex: row.hex?.message };
  });
}

function toDefaults(product: IAdminProduct | null): ProductFormValues {
  if (!product) {
    return {
      title: "",
      slug: "",
      category: "tees",
      price: 0,
      currency: "PHP",
      blurb: "",
      materials: "",
      sizeLabel: "Size",
      sizes: [],
      colors: [],
      comingSoon: false,
      sortOrder: 0,
      status: "draft",
      images: [],
    };
  }

  return {
    title: product.title,
    slug: product.slug,
    category: product.category,
    price: product.price,
    currency: product.currency,
    blurb: product.blurb,
    materials: product.materials,
    sizeLabel: product.sizeLabel,
    sizes: product.sizes,
    colors: product.colors,
    comingSoon: product.comingSoon,
    sortOrder: product.sortOrder,
    status: product.status,
    images: product.images,
  };
}

/**
 * The product editor — create and edit share one form.
 *
 * `useForm<Input, Context, Output>`: the controls hold strings (a number input
 * always does), Zod coerces them, and `handleSubmit` therefore hands the action
 * fully typed numbers.
 */
export function ProductForm({ product }: IProductFormProps) {
  const router = useRouter();
  const isEditing = product !== null;
  // Once the operator touches the slug, the title stops driving it.
  const [slugEdited, setSlugEdited] = useState(false);
  const [uploading, setUploading] = useState(0);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues, undefined, ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: toDefaults(product),
  });

  // `useWatch`, not the `watch()` returned by useForm: the latter is a fresh
  // function on every render, which the React Compiler refuses to memoize.
  const slug = useWatch({ control, name: "slug" });
  const comingSoon = useWatch({ control, name: "comingSoon" });

  const titleField = register("title", {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      // Only while creating, and only until the slug is edited by hand.
      // Rewriting a live product's slug silently changes its public URL.
      if (isEditing || slugEdited) return;
      setValue("slug", slugify(event.target.value), { shouldValidate: false });
    },
  });
  const slugField = register("slug", {
    onChange: () => setSlugEdited(true),
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveProduct(product?.id ?? null, values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    if (isEditing) {
      toast.success("Product saved.");
      // Re-seed the form with what was actually saved (trimmed, coerced), then
      // pull fresh server data for the surrounding page.
      reset(values);
      router.refresh();
      return;
    }

    toast.success("Product created.");
    // `replace`, not `push`: going Back to /new after a create would re-open an
    // empty form that looks like the product was lost.
    router.replace(`/admin/products/${result.id}`);
  });

  const colorErrors = toColorErrors(errors.colors);
  // Uploads land in Storage before the row exists, so a new product files them
  // under its slug and an existing one under its stable id.
  const uploadFolder = `products/${product?.id ?? (slug || "new")}`;
  const busy = isSubmitting || uploading > 0;

  return (
    <form onSubmit={onSubmit} className="pb-20" noValidate>
      <div className="grid gap-8">
        <section className="grid gap-4">
          <h2 className="text-sm font-semibold">Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Title"
              htmlFor="title"
              required
              error={errors.title?.message}
            >
              <Input
                id="title"
                aria-invalid={errors.title ? true : undefined}
                disabled={busy}
                {...titleField}
              />
            </Field>

            <Field
              label="Slug"
              htmlFor="slug"
              required
              hint={
                isEditing
                  ? "Changing this changes the public URL."
                  : "Filled in from the title until you edit it."
              }
              error={errors.slug?.message}
            >
              <Input
                id="slug"
                aria-invalid={errors.slug ? true : undefined}
                disabled={busy}
                {...slugField}
              />
            </Field>

            <Field
              label="Category"
              htmlFor="category"
              required
              error={errors.category?.message}
            >
              {/* Base UI Select is not a native input — it must be driven by a
                  Controller. `register()` here yields a silently empty field. */}
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger id="category" className="w-full" disabled={busy}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {CATEGORY_LABELS[category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field
              label="Status"
              htmlFor="status"
              required
              error={errors.status?.message}
            >
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger id="status" className="w-full" disabled={busy}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field
              label="Price"
              htmlFor="price"
              required
              hint={
                comingSoon
                  ? "Coming-soon products may be priced 0."
                  : "Whole units, no decimals."
              }
              error={errors.price?.message}
            >
              <Input
                id="price"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                aria-invalid={errors.price ? true : undefined}
                disabled={busy}
                {...register("price")}
              />
            </Field>

            <Field
              label="Currency"
              htmlFor="currency"
              required
              hint="ISO code, e.g. PHP."
              error={errors.currency?.message}
            >
              <Input
                id="currency"
                maxLength={3}
                autoCapitalize="characters"
                aria-invalid={errors.currency ? true : undefined}
                disabled={busy}
                {...register("currency")}
              />
            </Field>

            <Field
              label="Sort order"
              htmlFor="sortOrder"
              hint="Lower sorts first. Ties fall back to title."
              error={errors.sortOrder?.message}
            >
              <Input
                id="sortOrder"
                type="number"
                step={1}
                inputMode="numeric"
                aria-invalid={errors.sortOrder ? true : undefined}
                disabled={busy}
                {...register("sortOrder")}
              />
            </Field>

            <div className="grid gap-2">
              <span className="text-sm font-medium">Coming soon</span>
              <div className="flex items-center gap-2">
                {/* Switch is a Base UI primitive, not a checkbox input. */}
                <Controller
                  control={control}
                  name="comingSoon"
                  render={({ field }) => (
                    <Switch
                      id="comingSoon"
                      checked={field.value}
                      disabled={busy}
                      onCheckedChange={(checked) => field.onChange(checked)}
                    />
                  )}
                />
                <label htmlFor="comingSoon" className="text-muted-foreground text-xs">
                  Teaser only — shows a notify-me form instead of a price.
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <h2 className="text-sm font-semibold">Copy</h2>
          <Field label="Blurb" htmlFor="blurb" error={errors.blurb?.message}>
            <Textarea id="blurb" rows={3} disabled={busy} {...register("blurb")} />
          </Field>
          <Field
            label="Materials"
            htmlFor="materials"
            error={errors.materials?.message}
          >
            <Textarea
              id="materials"
              rows={3}
              disabled={busy}
              {...register("materials")}
            />
          </Field>
        </section>

        <section className="grid gap-4">
          <h2 className="text-sm font-semibold">Options</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Size label"
              htmlFor="sizeLabel"
              hint='Heading above the size pills, e.g. "Fit".'
              error={errors.sizeLabel?.message}
            >
              <Input id="sizeLabel" disabled={busy} {...register("sizeLabel")} />
            </Field>
            <Field
              label="Sizes"
              htmlFor="sizes"
              hint="Enter or comma to add. Renaming one orphans its stock rows."
              error={errors.sizes?.message}
            >
              <Controller
                control={control}
                name="sizes"
                render={({ field }) => (
                  <TagInput
                    id="sizes"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={busy}
                    placeholder="S, M, L"
                  />
                )}
              />
            </Field>
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-medium">Colours</span>
            <Controller
              control={control}
              name="colors"
              render={({ field }) => (
                <ColorsField
                  value={field.value}
                  onChange={field.onChange}
                  errors={colorErrors}
                  disabled={busy}
                />
              )}
            />
          </div>
        </section>

        <section className="grid gap-4">
          <h2 className="text-sm font-semibold">Images</h2>
          <p className="text-muted-foreground text-xs">
            The first image is the PDP hero. Files upload straight to storage —
            saving only records where they live.
          </p>
          <Controller
            control={control}
            name="images"
            render={({ field }) => (
              <ImageUploadField
                value={field.value}
                onChange={field.onChange}
                folder={uploadFolder}
                max={8}
                disabled={isSubmitting}
                onUploadingChange={setUploading}
              />
            )}
          />
        </section>
      </div>

      <div className="bg-background sticky bottom-0 mt-8 flex items-center justify-end gap-2 border-t py-3">
        <Button variant="outline" render={<Link href="/admin/products" />}>
          Cancel
        </Button>
        <SubmitButton pending={busy} pendingLabel={uploading > 0 ? "Uploading…" : "Saving…"}>
          {isEditing ? "Save changes" : "Create product"}
        </SubmitButton>
      </div>
    </form>
  );
}
