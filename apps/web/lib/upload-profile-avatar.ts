import type { SupabaseClient } from "@supabase/supabase-js";
import { fileToScrubbedJpegBlob } from "@/lib/image-scrubbed-jpeg";

export const PROFILE_AVATAR_BUCKET = "avatars";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_EDGE = 512;
const ALLOWED = /^image\/(jpeg|png|webp|gif)$/i;

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
    blob = await fileToScrubbedJpegBlob(file, {
      maxEdge: MAX_EDGE,
      maxBytes: MAX_BYTES,
    });
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Could not process image",
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
