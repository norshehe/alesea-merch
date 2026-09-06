"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Controller,
  useForm,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Field } from "@/features/admin/components/field";
import { SubmitButton } from "@/features/admin/components/submit-button";
import { ImageUploadField } from "@/features/admin/components/image-upload-field";
import { AssurancesField } from "@/features/admin/home/components/assurances-field";
import {
  homeSchema,
  type HomeFormValues,
  type HomeValues,
} from "@/features/admin/home/schemas/home.schema";
import { saveHomeContent } from "@/features/admin/home/server/home.actions";
import type { IAdminHomeContent } from "@/features/admin/home/server/home.queries";
import type { IHomeContent } from "@/lib/supabase/home/homeClient";

interface IHomeFormProps {
  content: IAdminHomeContent;
  /**
   * `HOME_FALLBACK`, handed down by the page. It is imported there because
   * `features/catalog/server/home.ts` is `server-only` and would throw if this
   * client component pulled it in. Rendered as placeholders so the operator can
   * see exactly what an empty field will show on the storefront.
   */
  defaults: IHomeContent;
}

const TABS = [
  { id: "hero", label: "Hero" },
  { id: "categories", label: "Categories" },
  { id: "assurances", label: "Assurances" },
  { id: "editorial", label: "Editorial" },
  { id: "carry", label: "Carry" },
  { id: "shoreline", label: "Shoreline" },
] as const;

type HomeTab = (typeof TABS)[number]["id"];

/**
 * Which fields live behind which tab.
 *
 * One form spans every tab with one Save button, so an error on a HIDDEN tab
 * would block submit with no visible feedback. `onInvalid` uses this map to
 * jump to the offending tab, and the triggers use it to show a dot.
 */
const FIELDS_BY_TAB: Record<HomeTab, (keyof HomeFormValues)[]> = {
  hero: [
    "title",
    "heroEyebrow",
    "heroHeading",
    "heroBody",
    "heroImage",
    "heroImageUrl",
    "heroPrimaryCta",
  ],
  categories: ["categoryEyebrow", "categoryHeading", "categoryBody"],
  assurances: ["assurances"],
  editorial: [
    "editorialEyebrow",
    "editorialHeading",
    "editorialImage",
    "editorialImageUrl",
    "editorialCta",
  ],
  carry: [
    "carryEyebrow",
    "carryHeading",
    "carryBody",
    "carryImage",
    "carryImageUrl",
  ],
  shoreline: ["shorelineHandle", "shorelineHeading", "shorelineBody"],
};

interface IAssuranceRowError {
  title?: { message?: string };
  body?: { message?: string };
}

/**
 * RHF describes nested array errors as a merge of `FieldError` and an array,
 * which cannot be indexed directly. Reading it through `unknown` avoids an
 * `as unknown as` cast — same helper shape the product form uses for colours.
 */
function toAssuranceErrors(
  value: unknown,
): ({ title?: string; body?: string } | undefined)[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows: unknown[] = value;
  return rows.map((entry) => {
    if (typeof entry !== "object" || entry === null) return undefined;
    const row: IAssuranceRowError = entry;
    return { title: row.title?.message, body: row.body?.message };
  });
}

type ImageName = "heroImage" | "editorialImage" | "carryImage";
type ImageUrlName = "heroImageUrl" | "editorialImageUrl" | "carryImageUrl";

interface IImagePairProps {
  control: Control<HomeFormValues, undefined, HomeValues>;
  register: UseFormRegister<HomeFormValues>;
  name: ImageName;
  urlName: ImageUrlName;
  /** Folder inside the `media` bucket, e.g. `content/home/hero`. */
  folder: string;
  /** Default image URL, shown as the URL placeholder. */
  fallbackUrl: string | null;
  busy: boolean;
  uploadDisabled: boolean;
  onUploadingChange: (count: number) => void;
}

/**
 * The `_path` / `_url` image pair the content tables use, three times over.
 *
 * Uploading wins over the external URL (`resolveImageUrl` prefers the path), so
 * the URL stays as the fallback for images that were never migrated off the old
 * CDN. Alt text is NOT stored for content images — the storefront supplies its
 * own — so the alt box inside the upload row is ignored on save.
 */
function ImagePairField({
  control,
  register,
  name,
  urlName,
  folder,
  fallbackUrl,
  busy,
  uploadDisabled,
  onUploadingChange,
}: IImagePairProps) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">Image</span>
      <p className="text-muted-foreground text-xs">
        An uploaded file wins over the URL below. Alt text is not stored for
        content images, so that box is ignored.
      </p>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <ImageUploadField
            value={field.value}
            onChange={field.onChange}
            folder={folder}
            max={1}
            disabled={uploadDisabled}
            onUploadingChange={onUploadingChange}
          />
        )}
      />
      <Field
        label="Image URL"
        htmlFor={urlName}
        hint="External image, used only when no file is uploaded. Empty falls back to the default."
      >
        <Input
          id={urlName}
          inputMode="url"
          placeholder={fallbackUrl ?? "https://…"}
          disabled={busy}
          {...register(urlName)}
        />
      </Field>
    </div>
  );
}

function toDefaults(content: IAdminHomeContent): HomeFormValues {
  return { ...content };
}

/**
 * Home page content, in one form across six tabs.
 *
 * Values on unmounted tabs survive because RHF keeps them by default
 * (`shouldUnregister: false`), and the panels are `keepMounted` so an upload in
 * flight is not thrown away by a tab switch.
 */
export function HomeForm({ content, defaults }: IHomeFormProps) {
  const router = useRouter();
  const [tab, setTab] = useState<HomeTab>("hero");
  const [uploading, setUploading] = useState(0);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HomeFormValues, undefined, HomeValues>({
    resolver: zodResolver(homeSchema),
    defaultValues: toDefaults(content),
  });

  const busy = isSubmitting || uploading > 0;

  const onSubmit = handleSubmit(
    async (values) => {
      const result = await saveHomeContent(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Home content saved.");
      // Re-seed with what was actually saved so the form stops reading dirty.
      reset(values);
      router.refresh();
    },
    (formErrors: FieldErrors<HomeFormValues>) => {
      const bad = TABS.find((candidate) =>
        FIELDS_BY_TAB[candidate.id].some((name) => name in formErrors),
      );
      if (bad) setTab(bad.id);
      toast.error("Some fields need attention.");
    },
  );

  function hasErrors(id: HomeTab): boolean {
    return FIELDS_BY_TAB[id].some((name) => name in errors);
  }

  return (
    <form onSubmit={onSubmit} className="pb-20" noValidate>
      <Tabs
        value={tab}
        onValueChange={(next) => {
          // No cast: match the incoming value against the known tab ids.
          const match = TABS.find((candidate) => candidate.id === next);
          if (match) setTab(match.id);
        }}
      >
        <TabsList className="mb-4 h-auto flex-wrap">
          {TABS.map((item) => (
            <TabsTrigger key={item.id} value={item.id}>
              {item.label}
              {hasErrors(item.id) ? (
                <span
                  className="bg-destructive size-1.5 rounded-full"
                  aria-label="Has errors"
                />
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="hero" keepMounted className="grid gap-4">
          <p className="text-muted-foreground text-sm">
            Clearing a field does not empty the home page — it restores the
            built-in default, shown here as the placeholder.
          </p>

          <Field
            label="Internal title"
            htmlFor="title"
            required
            hint="Admin-only label for this row. Never rendered."
            error={errors.title?.message}
          >
            <Input
              id="title"
              disabled={busy}
              aria-invalid={errors.title ? true : undefined}
              {...register("title")}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Eyebrow"
              htmlFor="heroEyebrow"
              error={errors.heroEyebrow?.message}
            >
              <Input
                id="heroEyebrow"
                placeholder={defaults.heroEyebrow}
                disabled={busy}
                {...register("heroEyebrow")}
              />
            </Field>

            <Field
              label="Primary CTA"
              htmlFor="heroPrimaryCta"
              hint="Label on the button into the shop grid."
              error={errors.heroPrimaryCta?.message}
            >
              <Input
                id="heroPrimaryCta"
                placeholder={defaults.heroPrimaryCta}
                disabled={busy}
                {...register("heroPrimaryCta")}
              />
            </Field>
          </div>

          <Field
            label="Heading"
            htmlFor="heroHeading"
            error={errors.heroHeading?.message}
          >
            <Input
              id="heroHeading"
              placeholder={defaults.heroHeading}
              disabled={busy}
              {...register("heroHeading")}
            />
          </Field>

          <Field label="Body" htmlFor="heroBody" error={errors.heroBody?.message}>
            <Textarea
              id="heroBody"
              rows={3}
              placeholder={defaults.heroBody}
              disabled={busy}
              {...register("heroBody")}
            />
          </Field>

          <ImagePairField
            control={control}
            register={register}
            name="heroImage"
            urlName="heroImageUrl"
            folder="content/home/hero"
            fallbackUrl={defaults.heroImage}
            busy={busy}
            uploadDisabled={isSubmitting}
            onUploadingChange={setUploading}
          />
        </TabsContent>

        <TabsContent value="categories" keepMounted className="grid gap-4">
          <div className="bg-muted/40 rounded-lg border p-3 text-sm">
            <p className="font-medium">The tiles live somewhere else</p>
            <p className="text-muted-foreground mt-1">
              Only this section&apos;s copy is edited here. The category tiles
              themselves — label, image, order and which filter they open — are
              rows in <code>shop_categories</code>.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              render={<Link href="/admin/categories" />}
            >
              Manage categories
            </Button>
          </div>

          <Field
            label="Eyebrow"
            htmlFor="categoryEyebrow"
            error={errors.categoryEyebrow?.message}
          >
            <Input
              id="categoryEyebrow"
              placeholder={defaults.categoryEyebrow}
              disabled={busy}
              {...register("categoryEyebrow")}
            />
          </Field>

          <Field
            label="Heading"
            htmlFor="categoryHeading"
            error={errors.categoryHeading?.message}
          >
            <Input
              id="categoryHeading"
              placeholder={defaults.categoryHeading}
              disabled={busy}
              {...register("categoryHeading")}
            />
          </Field>

          <Field
            label="Body"
            htmlFor="categoryBody"
            error={errors.categoryBody?.message}
          >
            <Textarea
              id="categoryBody"
              rows={3}
              placeholder={defaults.categoryBody}
              disabled={busy}
              {...register("categoryBody")}
            />
          </Field>
        </TabsContent>

        <TabsContent value="assurances" keepMounted className="grid gap-2">
          <span className="text-sm font-medium">Assurance cards</span>
          <p className="text-muted-foreground text-xs">
            The strip under the hero. The design fits <strong>four</strong>;
            more will wrap. Removing every row restores the four built-in cards
            rather than hiding the strip.
          </p>
          <Controller
            control={control}
            name="assurances"
            render={({ field }) => (
              <AssurancesField
                value={field.value}
                onChange={field.onChange}
                errors={toAssuranceErrors(errors.assurances)}
                disabled={busy}
              />
            )}
          />
        </TabsContent>

        <TabsContent value="editorial" keepMounted className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Eyebrow"
              htmlFor="editorialEyebrow"
              error={errors.editorialEyebrow?.message}
            >
              <Input
                id="editorialEyebrow"
                placeholder={defaults.editorialEyebrow}
                disabled={busy}
                {...register("editorialEyebrow")}
              />
            </Field>

            <Field
              label="CTA"
              htmlFor="editorialCta"
              error={errors.editorialCta?.message}
            >
              <Input
                id="editorialCta"
                placeholder={defaults.editorialCta}
                disabled={busy}
                {...register("editorialCta")}
              />
            </Field>
          </div>

          <Field
            label="Heading"
            htmlFor="editorialHeading"
            error={errors.editorialHeading?.message}
          >
            <Input
              id="editorialHeading"
              placeholder={defaults.editorialHeading}
              disabled={busy}
              {...register("editorialHeading")}
            />
          </Field>

          <ImagePairField
            control={control}
            register={register}
            name="editorialImage"
            urlName="editorialImageUrl"
            folder="content/home/editorial"
            fallbackUrl={defaults.editorialImage}
            busy={busy}
            uploadDisabled={isSubmitting}
            onUploadingChange={setUploading}
          />
        </TabsContent>

        <TabsContent value="carry" keepMounted className="grid gap-4">
          <Field
            label="Eyebrow"
            htmlFor="carryEyebrow"
            error={errors.carryEyebrow?.message}
          >
            <Input
              id="carryEyebrow"
              placeholder={defaults.carryEyebrow}
              disabled={busy}
              {...register("carryEyebrow")}
            />
          </Field>

          <Field
            label="Heading"
            htmlFor="carryHeading"
            error={errors.carryHeading?.message}
          >
            <Input
              id="carryHeading"
              placeholder={defaults.carryHeading}
              disabled={busy}
              {...register("carryHeading")}
            />
          </Field>

          <Field
            label="Body"
            htmlFor="carryBody"
            error={errors.carryBody?.message}
          >
            <Textarea
              id="carryBody"
              rows={4}
              placeholder={defaults.carryBody}
              disabled={busy}
              {...register("carryBody")}
            />
          </Field>

          <ImagePairField
            control={control}
            register={register}
            name="carryImage"
            urlName="carryImageUrl"
            folder="content/home/carry"
            fallbackUrl={defaults.carryImage}
            busy={busy}
            uploadDisabled={isSubmitting}
            onUploadingChange={setUploading}
          />
        </TabsContent>

        <TabsContent value="shoreline" keepMounted className="grid gap-4">
          <Field
            label="Handle"
            htmlFor="shorelineHandle"
            hint="Social handle shown above the gallery."
            error={errors.shorelineHandle?.message}
          >
            <Input
              id="shorelineHandle"
              placeholder={defaults.shorelineHandle}
              disabled={busy}
              {...register("shorelineHandle")}
            />
          </Field>

          <Field
            label="Heading"
            htmlFor="shorelineHeading"
            error={errors.shorelineHeading?.message}
          >
            <Input
              id="shorelineHeading"
              placeholder={defaults.shorelineHeading}
              disabled={busy}
              {...register("shorelineHeading")}
            />
          </Field>

          <Field
            label="Body"
            htmlFor="shorelineBody"
            error={errors.shorelineBody?.message}
          >
            <Textarea
              id="shorelineBody"
              rows={3}
              placeholder={defaults.shorelineBody}
              disabled={busy}
              {...register("shorelineBody")}
            />
          </Field>
        </TabsContent>
      </Tabs>

      <div className="bg-background sticky bottom-0 mt-8 flex items-center justify-end gap-2 border-t py-3">
        <SubmitButton
          pending={busy}
          pendingLabel={uploading > 0 ? "Uploading…" : "Saving…"}
        >
          Save home content
        </SubmitButton>
      </div>
    </form>
  );
}
