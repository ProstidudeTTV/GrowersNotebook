import type { SupabaseClient } from "@supabase/supabase-js";

export const PROFILE_AVATAR_BUCKET = "avatars";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_EDGE = 512;
const ALLOWED = /^image\/(jpeg|png|webp|gif)$/i;

/** Resize in-browser to JPEG for predictable size and MIME (bucket allows image/jpeg). */
function blobToResizedJpeg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process image"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not encode image"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.88,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

export type UploadProfileAvatarResult =
  | { ok: true; publicUrl: string }
  | { ok: false; message: string };

/**
 * Uploads to `avatars/{userId}/avatar.jpg` (replaces previous). Returns public object URL for PATCH /profiles/me.
 */
export async function uploadProfileAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<UploadProfileAvatarResult> {
  if (!ALLOWED.test(file.type)) {
    return {
      ok: false,
      message: "Use a JPEG, PNG, WebP, or GIF image.",
    };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "Image must be 2 MB or smaller." };
  }

  let blob: Blob;
  try {
    blob = await blobToResizedJpeg(file);
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Could not process image",
    };
  }

  if (blob.size > MAX_BYTES) {
    return {
      ok: false,
      message: "Processed image is still too large. Try a smaller original.",
    };
  }

  const path = `${userId}/avatar.jpg`;
  const { error: upErr } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(path, blob, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (upErr) {
    const msg = upErr.message ?? "Upload failed";
    if (/bucket|not found|404/i.test(msg)) {
      return {
        ok: false,
        message:
          "Avatar storage is not set up yet. Ask an admin to run the Supabase migration for the `avatars` storage bucket.",
      };
    }
    if (/policy|denied|403|row-level security/i.test(msg)) {
      return {
        ok: false,
        message:
          "Upload was blocked. Sign out and back in, or check storage policies for the `avatars` bucket.",
      };
    }
    return { ok: false, message: msg };
  }

  const { data } = supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .getPublicUrl(path);

  const publicUrl = data.publicUrl;
  if (!publicUrl?.startsWith("https://")) {
    return { ok: false, message: "Could not get public URL for upload." };
  }

  return { ok: true, publicUrl };
}
