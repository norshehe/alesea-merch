"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET, publicUrl } from "@/lib/supabase/storage";

/** One uploaded object in the `media` bucket, as an admin form holds it. */
export interface IUploadedImage {
  /** Public CDN URL — what `next/image` renders. */
  url: string;
  /** Object key inside the `media` bucket — what the database stores. */
  path: string;
  alt: string;
  width: number;
  height: number;
}

/** Storage caps uploads well above this; 5MB is a product-photo sanity limit. */
const MAX_BYTES = 5 * 1024 * 1024;

interface IImageUploadFieldProps {
  value: IUploadedImage[];
  onChange: (next: IUploadedImage[]) => void;
  /**
   * Folder inside the `media` bucket, e.g. `products/<id>`. Only a prefix —
   * every file still gets its own UUID name.
   */
  folder: string;
  /** Upper bound on images. `max={1}` turns this into a single-image picker. */
  max?: number;
  disabled?: boolean;
  /**
   * Number of uploads still in flight. The form disables Save while this is
   * above zero, otherwise a save can persist rows for half-uploaded files.
   */
  onUploadingChange?: (count: number) => void;
}

/**
 * Direct browser → Supabase Storage image field.
 *
 * ⚠️ Uploads MUST NOT go through a Server Action: the request body cap is ~1MB
 * and real product photography is larger, so the action would fail on exactly
 * the files that matter. The browser client is authenticated by the same admin
 * cookie, and the `media` bucket's admin-write policy applies to it.
 *
 * Dimensions are measured HERE because Storage returns none, and
 * `product_images.width/height` (and `next/image`) need them.
 */
export function ImageUploadField({
  value,
  onChange,
  folder,
  max = 8,
  disabled,
  onUploadingChange,
}: IImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);

  function setUploadCount(next: number) {
    setUploading(next);
    onUploadingChange?.(next);
  }

  async function measure(file: File): Promise<{ width: number; height: number }> {
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(file);
        const size = { width: bitmap.width, height: bitmap.height };
        bitmap.close();
        return size;
      } catch {
        // Some browsers refuse certain encodings — fall through to <img>.
      }
    }
    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(objectUrl);
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    });
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const supabase = createSupabaseBrowserClient();
    // Local accumulator: `value` is a stale closure after the first onChange.
    let next = [...value];
    let inFlight = 0;

    const accepted: File[] = [];
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is larger than 5MB.`);
        continue;
      }
      if (next.length + accepted.length >= max) {
        toast.error(`Only ${max} image${max === 1 ? "" : "s"} allowed.`);
        break;
      }
      accepted.push(file);
    }

    if (accepted.length === 0) return;

    inFlight = accepted.length;
    setUploadCount(inFlight);

    for (const file of accepted) {
      try {
        const size = await measure(file);
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        // A fresh UUID every time. Reusing a path would serve the PREVIOUS
        // image from the CDN for hours — the bucket is public and cached.
        const path = `${folder}/${crypto.randomUUID()}.${extension}`;

        const { error } = await supabase.storage
          .from(MEDIA_BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });

        if (error) throw error;

        const url = publicUrl(path);
        if (!url) throw new Error("Storage URL is not configured.");

        next = [...next, { url, path, alt: "", width: size.width, height: size.height }];
        onChange(next);
      } catch (error) {
        console.error("[admin-images] upload failed", error);
        toast.error(`Couldn't upload ${file.name}.`);
      } finally {
        inFlight -= 1;
        setUploadCount(inFlight);
      }
    }

    // Allow re-picking the same file after a failure.
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleRemove(index: number) {
    const image = value[index];
    onChange(value.filter((_, i) => i !== index));

    // Best effort: the row is already gone from the form, so a failed delete
    // costs an orphaned object, never a broken product.
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .remove([image.path]);
    if (error) {
      console.error("[admin-images] remove failed", error);
      toast.warning("Image removed, but the file is still in storage.");
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  const atMax = value.length >= max;

  return (
    <div className="grid gap-2">
      {value.map((image, index) => (
        <div
          key={image.path}
          className="bg-card flex items-start gap-3 rounded-lg border p-2"
        >
          <Image
            src={image.url}
            alt={image.alt || "Product image"}
            width={96}
            height={96}
            className="bg-muted size-24 shrink-0 rounded-md object-cover"
          />
          <div className="grid min-w-0 flex-1 gap-1.5">
            <span className="text-muted-foreground text-xs">
              {index === 0 ? "Hero image" : `Position ${index + 1}`}
            </span>
            <Input
              aria-label={`Alt text for image ${index + 1}`}
              placeholder="Alt text (describe the photo)"
              value={image.alt}
              disabled={disabled}
              onChange={(event) =>
                onChange(
                  value.map((img, i) =>
                    i === index ? { ...img, alt: event.target.value } : img,
                  ),
                )
              }
            />
            <span className="text-muted-foreground truncate text-xs">
              {image.width}×{image.height}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Move image ${index + 1} up`}
              disabled={disabled || index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowUp aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Move image ${index + 1} down`}
              disabled={disabled || index === value.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDown aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove image ${index + 1}`}
              disabled={disabled}
              onClick={() => void handleRemove(index)}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        </div>
      ))}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={max > 1}
        className="sr-only"
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-self-start"
        disabled={disabled || atMax || uploading > 0}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus aria-hidden="true" />
        {uploading > 0
          ? `Uploading ${uploading}…`
          : atMax
            ? `Maximum ${max} reached`
            : "Add image"}
      </Button>
    </div>
  );
}
