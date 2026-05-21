import type { SupabaseClient } from "@supabase/supabase-js";
import { fileToScrubbedJpegBlob } from "@/lib/image-scrubbed-jpeg";
import { PROFILE_AVATAR_BUCKET } from "@/lib/upload-profile-avatar";

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_EDGE = 1920;
const ALLOWED = /^image\/(jpeg|png|webp|gif)$/i;

export type UploadProfileBannerResult =
  | { ok: true; publicUrl: string }
  | { ok: false; message: string };

/**
 * Wide profile cover in `avatars/{userId}/banner-{ts}.jpg` (same bucket policies as avatar).
 */
export async function uploadProfileBanner(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<UploadProfileBannerResult> {
  if (!ALLOWED.test(file.type)) {
    return {
      ok: false,
      message: "Use a JPEG, PNG, WebP, or GIF image.",
    };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "Cover image must be 3 MB or smaller." };
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

  const path = `${userId}/banner-${Date.now()}.jpg`;
  const { error: upErr } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(path, blob, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (upErr) {
    const msg = upErr.message ?? "Upload failed";
    if (/bucket|not found|404/i.test(msg)) {
      return {
        ok: false,
        message:
          "Cover storage is not set up yet. Run the Supabase migration for the `avatars` bucket.",
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
