"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/features/admin/components/field";
import { SelectField } from "@/features/admin/components/select-field";
import { SwitchField } from "@/features/admin/components/switch-field";
import { SubmitButton } from "@/features/admin/components/submit-button";
import { useUnsavedChangesGuard } from "@/features/admin/hooks/use-unsaved-changes-guard";
import { ImageUploadField } from "@/features/admin/components/image-upload-field";
import {
  CATEGORY_FILTER_KEYS,
  CATEGORY_FILTER_KEY_LABELS,
  categorySchema,
  type CategoryFormValues,
  type CategoryValues,
} from "@/features/admin/categories/schemas/category.schema";
import { saveCategory } from "@/features/admin/categories/server/category.actions";
import type { IAdminCategory } from "@/features/admin/categories/server/category.queries";

const FILTER_KEY_OPTIONS = CATEGORY_FILTER_KEYS.map((key) => ({
  value: key,
  label: CATEGORY_FILTER_KEY_LABELS[key],
}));

interface ICategoryFormProps {
  /** `null` when creating. */
  category: IAdminCategory | null;
}

function toDefaults(category: IAdminCategory | null): CategoryFormValues {
  if (!category) {
    return {
      label: "",
      eyebrow: "Collection",
      filterKey: "all",
      image: [],
      imageUrl: "",
      sortOrder: 0,
      isActive: true,
    };
  }

  return {
    label: category.label,
    eyebrow: category.eyebrow,
    filterKey: category.filterKey,
    image: category.image ? [category.image] : [],
    imageUrl: category.imageUrl,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
  };
}

/**
 * The category-tile editor — create and edit share one form.
 *
 * `useForm<Input, Context, Output>`: the number control holds a string, Zod
 * coerces it, and `handleSubmit` therefore hands the action a real number.
 */
export function CategoryForm({ category }: ICategoryFormProps) {
  const router = useRouter();
  const isEditing = category !== null;
  const [uploading, setUploading] = useState(0);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<CategoryFormValues, undefined, CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: toDefaults(category),
  });

  // An upload counts as unsaved work: the bytes are in Storage but nothing
  // references them until Save writes `image_path`.
  useUnsavedChangesGuard(isDirty || uploading > 0);

  // `useWatch`, not the `watch()` returned by useForm: the latter is a fresh
  // function on every render, which the React Compiler refuses to memoize.
  const image = useWatch({ control, name: "image" });
  const imageUrl = useWatch({ control, name: "imageUrl" });
  const hasUpload = (image?.length ?? 0) > 0;

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveCategory(category?.id ?? null, values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    if (isEditing) {
      toast.success("Category saved.");
      // Re-seed the form with what was actually saved (trimmed, coerced), then
      // pull fresh server data for the surrounding page.
      reset(values);
      router.refresh();
      return;
    }

    toast.success("Category created.");
    // `replace`, not `push`: going Back to /new after a create would re-open an
    // empty form that looks like the category was lost.
    router.replace(`/admin/categories/${result.id}`);
  });

  // Uploads land in Storage before the row exists, so a new category files them
  // under a placeholder and an existing one under its stable id.
  const uploadFolder = `categories/${category?.id ?? "new"}`;
  const busy = isSubmitting || uploading > 0;

  return (
    <form onSubmit={onSubmit} className="pb-20" noValidate>
      <div className="grid gap-8">
        <section className="grid gap-4">
          <h2 className="text-sm font-semibold">Tile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Label"
              htmlFor="label"
              required
              hint="The big text on the tile, e.g. “Tees”."
              error={errors.label?.message}
            >
              <Input
                id="label"
                disabled={busy}
                {...register("label")}
              />
            </Field>

            <Field
              label="Eyebrow"
              htmlFor="eyebrow"
              hint="Small text above the label. Defaults to “Collection” when blank."
              error={errors.eyebrow?.message}
            >
              <Input
                id="eyebrow"
                disabled={busy}
                {...register("eyebrow")}
              />
            </Field>

            <SelectField
              control={control}
              name="filterKey"
              label="Filter key"
              options={FILTER_KEY_OPTIONS}
              required
              hint="Which catalog filter the tile opens."
              disabled={busy}
              error={errors.filterKey?.message}
            />

            <Field
              label="Sort order"
              htmlFor="sortOrder"
              hint="Lower sorts first. Ties fall back to label."
              error={errors.sortOrder?.message}
            >
              <Input
                id="sortOrder"
                type="number"
                step={1}
                inputMode="numeric"
                disabled={busy}
                {...register("sortOrder")}
              />
            </Field>

            <SwitchField
              control={control}
              name="isActive"
              label="Visible"
              description="Hidden categories stay here but disappear from the home page."
              disabled={busy}
              error={errors.isActive?.message}
            />
          </div>
        </section>

        <section className="grid gap-4">
          <h2 className="text-sm font-semibold">Image</h2>
          <p className="text-muted-foreground text-xs">
            Upload a file, or paste an external URL below. An uploaded image
            always wins — clear it if you want the URL to show again.
          </p>
          <Controller
            control={control}
            name="image"
            render={({ field }) => (
              <ImageUploadField
                value={field.value}
                onChange={field.onChange}
                folder={uploadFolder}
                max={1}
                disabled={isSubmitting}
                onUploadingChange={setUploading}
              />
            )}
          />

          <Field
            label="External image URL"
            htmlFor="imageUrl"
            hint={
              hasUpload
                ? "Ignored while an image is uploaded above."
                : "For imagery hosted elsewhere, e.g. the villa photography."
            }
            error={errors.imageUrl?.message}
          >
            <Input
              id="imageUrl"
              type="url"
              inputMode="url"
              placeholder="https://…"
              disabled={busy}
              {...register("imageUrl")}
            />
          </Field>

          {!hasUpload && imageUrl?.trim().length === 0 ? (
            <p className="text-muted-foreground text-xs">
              With neither set the tile renders without an image.
            </p>
          ) : null}
        </section>
      </div>

      <div className="bg-background sticky bottom-0 mt-8 flex items-center justify-end gap-2 border-t py-3">
        <Button variant="outline" render={<Link href="/admin/categories" />}>
          Cancel
        </Button>
        <SubmitButton
          pending={busy}
          pendingLabel={uploading > 0 ? "Uploading…" : "Saving…"}
        >
          {isEditing ? "Save changes" : "Create category"}
        </SubmitButton>
      </div>
    </form>
  );
}
