"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field } from "@/features/admin/components/field";
import { SubmitButton } from "@/features/admin/components/submit-button";
import { useUnsavedChangesGuard } from "@/features/admin/hooks/use-unsaved-changes-guard";
import { ImageUploadField } from "@/features/admin/components/image-upload-field";
import { LinkListField } from "@/features/admin/components/link-list-field";
import {
  settingsSchema,
  type SettingsFormValues,
  type SettingsValues,
} from "@/features/admin/settings/schemas/settings.schema";
import { saveSiteSettings } from "@/features/admin/settings/server/settings.actions";
import type { IAdminSiteSettings } from "@/features/admin/settings/server/settings.queries";
import type { ISiteSettings } from "@/lib/supabase/siteSettings/siteSettingsClient";

interface ISettingsFormProps {
  settings: IAdminSiteSettings;
  /**
   * `SETTINGS_FALLBACK`, handed down by the page. It is imported there because
   * `features/catalog/server/settings.ts` is `server-only` and would throw if
   * this client component pulled it in directly. Shown as placeholders so the
   * operator can see what an empty field will actually render.
   */
  defaults: ISiteSettings;
}

const TABS = [
  { id: "brand", label: "Brand" },
  { id: "shipping", label: "Shipping" },
  { id: "contact", label: "Contact" },
  { id: "navigation", label: "Navigation" },
  { id: "social", label: "Social" },
] as const;

type SettingsTab = (typeof TABS)[number]["id"];

/**
 * Which fields live behind which tab.
 *
 * One form spans every tab with one Save button, so a validation error on a
 * HIDDEN tab would otherwise block submit with no visible feedback at all.
 * `onInvalid` uses this map to jump to the offending tab, and the triggers use
 * it to show a dot.
 */
const FIELDS_BY_TAB: Record<SettingsTab, (keyof SettingsFormValues)[]> = {
  brand: [
    "title",
    "logoImage",
    "logoUrl",
    "logoAlt",
    "logoWidth",
    "logoHeight",
    "currency",
  ],
  shipping: ["freeShipThreshold", "standardShipping", "expressShipping"],
  contact: [
    "contactEmail",
    "contactAddress",
    "contactSocial",
    "location",
    "footerBlurb",
  ],
  navigation: ["navLinks", "bookNowLabel", "bookNowUrl"],
  social: ["socialLinks"],
};

interface ILinkRowError {
  label?: { message?: string };
  href?: { message?: string };
}

/**
 * RHF describes nested array errors as a merge of `FieldError` and an array,
 * which cannot be indexed directly. Reading it through `unknown` keeps this
 * honest without an `as unknown as` cast — same helper shape as the product
 * form uses for colours.
 */
function toLinkErrors(
  value: unknown,
): ({ label?: string; href?: string } | undefined)[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows: unknown[] = value;
  return rows.map((entry) => {
    if (typeof entry !== "object" || entry === null) return undefined;
    const row: ILinkRowError = entry;
    return { label: row.label?.message, href: row.href?.message };
  });
}

function toDefaults(settings: IAdminSiteSettings): SettingsFormValues {
  return {
    title: settings.title,
    logoImage: settings.logoImage,
    logoUrl: settings.logoUrl,
    logoAlt: settings.logoAlt,
    logoWidth: settings.logoWidth,
    logoHeight: settings.logoHeight,
    currency: settings.currency,
    freeShipThreshold: settings.freeShipThreshold,
    standardShipping: settings.standardShipping,
    expressShipping: settings.expressShipping,
    location: settings.location,
    footerBlurb: settings.footerBlurb,
    contactEmail: settings.contactEmail,
    contactAddress: settings.contactAddress,
    contactSocial: settings.contactSocial,
    navLinks: settings.navLinks,
    bookNowLabel: settings.bookNowLabel,
    bookNowUrl: settings.bookNowUrl,
    socialLinks: settings.socialLinks,
  };
}

/**
 * Site-wide settings, in one form across five tabs.
 *
 * Values on unmounted tabs survive because RHF keeps them by default
 * (`shouldUnregister: false`), and the panels are `keepMounted` so an upload in
 * flight is not thrown away by a tab switch.
 */
export function SettingsForm({ settings, defaults }: ISettingsFormProps) {
  const router = useRouter();
  const [tab, setTab] = useState<SettingsTab>("brand");
  const [uploading, setUploading] = useState(0);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SettingsFormValues, undefined, SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: toDefaults(settings),
  });

  // A multi-tab form: unsaved work can sit on a tab that is not even visible,
  // which makes losing it to a stray reload especially easy. An upload counts
  // too — the bytes are in Storage but nothing references them until Save.
  useUnsavedChangesGuard(isDirty || uploading > 0);

  // `useWatch`, not the `watch()` from useForm: the latter is a new function on
  // every render, which the React Compiler refuses to memoize.
  const logoImage = useWatch({ control, name: "logoImage" });
  const hasUpload = (logoImage?.length ?? 0) > 0;

  const busy = isSubmitting || uploading > 0;

  const onValid = handleSubmit(
    async (values) => {
      const result = await saveSiteSettings(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Settings saved.");
      // Re-seed with what was actually saved (trimmed, coerced) so the form
      // stops reading as dirty, then refresh the server data behind it.
      reset(values);
      router.refresh();
    },
    (formErrors: FieldErrors<SettingsFormValues>) => {
      const bad = TABS.find((candidate) =>
        FIELDS_BY_TAB[candidate.id].some((name) => name in formErrors),
      );
      if (bad) setTab(bad.id);
      toast.error("Some fields need attention.");
    },
  );

  function hasErrors(id: SettingsTab): boolean {
    return FIELDS_BY_TAB[id].some((name) => name in errors);
  }

  return (
    <form onSubmit={onValid} className="pb-20" noValidate>
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

        <TabsContent value="brand" keepMounted className="grid gap-4">
          <Field
            label="Site title"
            htmlFor="title"
            required
            hint="Used as the browser tab title and metadata name."
            error={errors.title?.message}
          >
            <Input
              id="title"
              disabled={busy}
              aria-invalid={errors.title ? true : undefined}
              {...register("title")}
            />
          </Field>

          <div className="grid gap-2">
            <span className="text-sm font-medium">Logo file</span>
            <p className="text-muted-foreground text-xs">
              An uploaded file wins over the external URL below. Its dimensions
              fill in automatically — the header only draws a logo whose width
              is above zero.
            </p>
            <Controller
              control={control}
              name="logoImage"
              render={({ field }) => (
                <ImageUploadField
                  value={field.value}
                  onChange={(next) => {
                    field.onChange(next);
                    const image = next[0];
                    if (!image) return;
                    // The alt box inside the upload row is the single alt input
                    // while a file is attached, so mirror it into the column
                    // the storefront actually reads.
                    setValue("logoAlt", image.alt, { shouldDirty: true });
                    setValue("logoWidth", image.width, { shouldDirty: true });
                    setValue("logoHeight", image.height, { shouldDirty: true });
                  }}
                  folder="content/logo"
                  max={1}
                  disabled={isSubmitting}
                  onUploadingChange={setUploading}
                />
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Logo URL"
              htmlFor="logoUrl"
              hint="External image, used only when no file is uploaded."
              error={errors.logoUrl?.message}
            >
              <Input
                id="logoUrl"
                inputMode="url"
                placeholder="https://…"
                disabled={busy}
                aria-invalid={errors.logoUrl ? true : undefined}
                {...register("logoUrl")}
              />
            </Field>

            {/* Hidden while a file is attached: its own alt box above is then
                the one visible input for this column, and two controls writing
                one value is how they end up disagreeing. */}
            {hasUpload ? null : (
              <Field
                label="Logo alt text"
                htmlFor="logoAlt"
                hint="Describes the logo for screen readers."
                error={errors.logoAlt?.message}
              >
                <Input
                  id="logoAlt"
                  disabled={busy}
                  aria-invalid={errors.logoAlt ? true : undefined}
                  {...register("logoAlt")}
                />
              </Field>
            )}

            <Field
              label="Logo width"
              htmlFor="logoWidth"
              hint="Pixels. 0 hides the logo and shows the wordmark instead."
              error={errors.logoWidth?.message}
            >
              <Input
                id="logoWidth"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                disabled={busy}
                aria-invalid={errors.logoWidth ? true : undefined}
                {...register("logoWidth")}
              />
            </Field>

            <Field
              label="Logo height"
              htmlFor="logoHeight"
              hint="Pixels."
              error={errors.logoHeight?.message}
            >
              <Input
                id="logoHeight"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                disabled={busy}
                aria-invalid={errors.logoHeight ? true : undefined}
                {...register("logoHeight")}
              />
            </Field>

            <Field
              label="Currency"
              htmlFor="currency"
              hint={`ISO code for every price. Empty falls back to ${defaults.currency}.`}
              error={errors.currency?.message}
            >
              <Input
                id="currency"
                maxLength={3}
                autoCapitalize="characters"
                placeholder={defaults.currency}
                disabled={busy}
                aria-invalid={errors.currency ? true : undefined}
                {...register("currency")}
              />
            </Field>
          </div>
        </TabsContent>

        <TabsContent value="shipping" keepMounted className="grid gap-4">
          <p className="text-muted-foreground text-sm">
            Amounts are whole units of the shop currency. Leave a field at{" "}
            <strong>0</strong> to use the built-in default shown in the box —
            the storefront only accepts a value above zero.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Free shipping over"
              htmlFor="freeShipThreshold"
              hint={`0 falls back to ${defaults.freeShipThreshold}.`}
              error={errors.freeShipThreshold?.message}
            >
              <Input
                id="freeShipThreshold"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                placeholder={String(defaults.freeShipThreshold)}
                disabled={busy}
                aria-invalid={errors.freeShipThreshold ? true : undefined}
                {...register("freeShipThreshold")}
              />
            </Field>

            <Field
              label="Standard shipping"
              htmlFor="standardShipping"
              hint={`0 falls back to ${defaults.standardShipping}.`}
              error={errors.standardShipping?.message}
            >
              <Input
                id="standardShipping"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                placeholder={String(defaults.standardShipping)}
                disabled={busy}
                aria-invalid={errors.standardShipping ? true : undefined}
                {...register("standardShipping")}
              />
            </Field>

            <Field
              label="Express shipping"
              htmlFor="expressShipping"
              hint={`0 falls back to ${defaults.expressShipping}.`}
              error={errors.expressShipping?.message}
            >
              <Input
                id="expressShipping"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                placeholder={String(defaults.expressShipping)}
                disabled={busy}
                aria-invalid={errors.expressShipping ? true : undefined}
                {...register("expressShipping")}
              />
            </Field>
          </div>
        </TabsContent>

        <TabsContent value="contact" keepMounted className="grid gap-4">
          <p className="text-muted-foreground text-sm">
            Shown in the footer. Clearing a field does not empty the footer — it
            restores the built-in default shown as the placeholder.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Contact email"
              htmlFor="contactEmail"
              hint="Empty falls back to the default address."
              error={errors.contactEmail?.message}
            >
              <Input
                id="contactEmail"
                type="email"
                inputMode="email"
                placeholder={defaults.contactEmail}
                disabled={busy}
                aria-invalid={errors.contactEmail ? true : undefined}
                {...register("contactEmail")}
              />
            </Field>

            <Field
              label="Contact address"
              htmlFor="contactAddress"
              error={errors.contactAddress?.message}
            >
              <Input
                id="contactAddress"
                placeholder={defaults.contactAddress}
                disabled={busy}
                aria-invalid={errors.contactAddress ? true : undefined}
                {...register("contactAddress")}
              />
            </Field>

            <Field
              label="Contact social"
              htmlFor="contactSocial"
              hint="Plain text line, e.g. “Instagram · Facebook”."
              error={errors.contactSocial?.message}
            >
              <Input
                id="contactSocial"
                placeholder={defaults.contactSocial}
                disabled={busy}
                aria-invalid={errors.contactSocial ? true : undefined}
                {...register("contactSocial")}
              />
            </Field>

            <Field
              label="Location"
              htmlFor="location"
              hint="Short place line under the wordmark."
              error={errors.location?.message}
            >
              <Input
                id="location"
                placeholder={defaults.location}
                disabled={busy}
                aria-invalid={errors.location ? true : undefined}
                {...register("location")}
              />
            </Field>
          </div>

          <Field
            label="Footer blurb"
            htmlFor="footerBlurb"
            hint="One or two sentences under the footer wordmark."
            error={errors.footerBlurb?.message}
          >
            <Textarea
              id="footerBlurb"
              rows={3}
              placeholder={defaults.footerBlurb}
              disabled={busy}
              aria-invalid={errors.footerBlurb ? true : undefined}
              {...register("footerBlurb")}
            />
          </Field>
        </TabsContent>

        <TabsContent value="navigation" keepMounted className="grid gap-4">
          <div className="grid gap-2">
            <span className="text-sm font-medium">Navigation links</span>
            <p className="text-muted-foreground text-xs">
              Extra items appended to the header nav, which already mirrors
              alesea.co in code. Leaving this empty is normal. Every row needs
              both a label and a URL — the database rejects half-filled rows.
            </p>
            <Controller
              control={control}
              name="navLinks"
              render={({ field }) => (
                <LinkListField
                  value={field.value}
                  onChange={field.onChange}
                  errors={toLinkErrors(errors.navLinks)}
                  disabled={busy}
                  addLabel="Add nav link"
                  labelPlaceholder="Stay"
                  hrefPlaceholder="https://alesea.co/stay"
                />
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Book Now label"
              htmlFor="bookNowLabel"
              hint={`Empty falls back to “${defaults.bookNowLabel}”.`}
              error={errors.bookNowLabel?.message}
            >
              <Input
                id="bookNowLabel"
                placeholder={defaults.bookNowLabel}
                disabled={busy}
                aria-invalid={errors.bookNowLabel ? true : undefined}
                {...register("bookNowLabel")}
              />
            </Field>

            <Field
              label="Book Now URL"
              htmlFor="bookNowUrl"
              hint="Empty falls back to the booking site."
              error={errors.bookNowUrl?.message}
            >
              <Input
                id="bookNowUrl"
                inputMode="url"
                placeholder={defaults.bookNowUrl}
                disabled={busy}
                aria-invalid={errors.bookNowUrl ? true : undefined}
                {...register("bookNowUrl")}
              />
            </Field>
          </div>
        </TabsContent>

        <TabsContent value="social" keepMounted className="grid gap-2">
          <span className="text-sm font-medium">Social links</span>
          <p className="text-muted-foreground text-xs">
            Rendered in the footer. Removing every row does not hide the socials
            — it restores the defaults ({defaults.socialLinks.length} links,
            starting with {defaults.socialLinks[0]?.label ?? "none"}).
          </p>
          <Controller
            control={control}
            name="socialLinks"
            render={({ field }) => (
              <LinkListField
                value={field.value}
                onChange={field.onChange}
                errors={toLinkErrors(errors.socialLinks)}
                disabled={busy}
                addLabel="Add social link"
                labelPlaceholder="Instagram"
                hrefPlaceholder="https://www.instagram.com/alesea.co"
              />
            )}
          />
        </TabsContent>
      </Tabs>

      <div className="bg-background sticky bottom-0 mt-8 flex items-center justify-end gap-2 border-t py-3">
        <SubmitButton
          pending={busy}
          pendingLabel={uploading > 0 ? "Uploading…" : "Saving…"}
        >
          Save settings
        </SubmitButton>
      </div>
    </form>
  );
}
