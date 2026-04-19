import type { SupabaseClient } from "@supabase/supabase-js";
import { fileToScrubbedJpegBlob } from "@/lib/image-scrubbed-jpeg";

export const POST_MEDIA_BUCKET = "post-media";

const IMAGE_MAX = 8 * 1024 * 1024;
const VIDEO_MAX = 50 * 1024 * 1024;
const IMAGE_MAX_EDGE = 1600;
/** Samsung / Android often send `image/jpg`, generic `image/*`, or empty `type`. */
const IMAGE_TYPES =
  /^image\/(jpeg|jpg|pjpeg|png|webp|gif)$/i;
const VIDEO_TYPES = /^video\/(mp4|webm|quicktime)$/i;

/**
 * Many mobile pickers leave `file.type` empty or use non-standard MIME strings.
 * Infer from type, extension, or (last resort) accept as image and let decode validate.
 */
function inferredImageMime(file: File): string | null {
  const raw = (file.type ?? "").trim();
  const t = raw.toLowerCase();
  if (t === "image/heic" || t === "image/heif") return null;
  if (t && IMAGE_TYPES.test(t)) {
    if (t === "image/jpg" || t === "image/pjpeg") return "image/jpeg";
    return raw;
  }
  if (t.startsWith("image/")) {
    return "image/jpeg";
  }
  const n = file.name.toLowerCase();
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
  if (!t && file.size > 0) {
    return "image/jpeg";
  }
  return null;
}

function inferredVideoMime(file: File): string | null {
  const raw = (file.type ?? "").trim();
  if (raw && VIDEO_TYPES.test(raw)) return raw;
  const n = file.name.toLowerCase();
  if (n.endsWith(".mp4")) return "video/mp4";
  if (n.endsWith(".webm")) return "video/webm";
  if (n.endsWith(".mov")) return "video/quicktime";
  return null;
}

/** Gate uploads in UI (dropzone) — same rules as `uploadPostImage` / `uploadPostVideo`. */
export function isProcessablePostImage(file: File): boolean {
  return inferredImageMime(file) != null;
}

export function isProcessablePostVideo(file: File): boolean {
  return inferredVideoMime(file) != null;
}

function extForVideo(mime: string): string {
  if (/quicktime/i.test(mime)) return "mov";
  if (/webm/i.test(mime)) return "webm";
  return "mp4";
}

export type UploadPostMediaResult =
  | {
      ok: true;
      publicUrl: string;
      /** Set for video uploads — use with server-side metadata strip. */
      storagePath?: string;
      videoContentType?: "video/mp4" | "video/webm" | "video/quicktime";
    }
  | { ok: false; message: string };

export async function uploadPostImage(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<UploadPostMediaResult> {
  if (!inferredImageMime(file)) {
    return {
      ok: false,
      message:
        "Use a JPEG, PNG, WebP, or GIF image. (HEIC from some phone cameras is not supported yet—convert or re-save as JPEG in your gallery.)",
    };
  }
  if (file.size > IMAGE_MAX) {
    return { ok: false, message: "Image must be 8 MB or smaller." };
  }

  let blob: Blob;
  try {
    blob = await fileToScrubbedJpegBlob(file, {
      maxEdge: IMAGE_MAX_EDGE,
      maxBytes: IMAGE_MAX,
    });
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Could not process image",
    };
  }

  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const path = `${userId}/${id}.jpg`;

  const { error } = await supabase.storage
    .from(POST_MEDIA_BUCKET)
    .upload(path, blob, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) {
    return { ok: false, message: uploadErrorMessage(error.message) };
  }

  const { data } = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  if (!publicUrl?.startsWith("https://")) {
    return { ok: false, message: "Could not get public URL for upload." };
  }
  return { ok: true, publicUrl };
}

export async function uploadPostVideo(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<UploadPostMediaResult> {
  const videoMime = inferredVideoMime(file);
  if (!videoMime) {
    return {
      ok: false,
      message: "Use an MP4, WebM, or MOV video.",
    };
  }
  if (file.size > VIDEO_MAX) {
    return { ok: false, message: "Video must be 50 MB or smaller." };
  }

  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ext = extForVideo(videoMime);
  const path = `${userId}/${id}.${ext}`;

  const { error } = await supabase.storage
    .from(POST_MEDIA_BUCKET)
    .upload(path, file, {
      contentType: videoMime,
      upsert: false,
    });

  if (error) {
    return { ok: false, message: uploadErrorMessage(error.message) };
  }

  const { data } = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  if (!publicUrl?.startsWith("https://")) {
    return { ok: false, message: "Could not get public URL for upload." };
  }
  return {
    ok: true,
    publicUrl,
    storagePath: path,
    videoContentType: videoMime as
      | "video/mp4"
      | "video/webm"
      | "video/quicktime",
  };
}

function uploadErrorMessage(msg: string): string {
  const m = msg ?? "Upload failed";
  if (/bucket|not found|404/i.test(m)) {
    return "Media storage is not set up yet. Run the database storage migration for the `post-media` bucket.";
  }
  if (/policy|denied|403|row-level security/i.test(m)) {
    return "Upload was blocked. Sign out and back in, or check storage policies for `post-media`.";
  }
  return m;
}
