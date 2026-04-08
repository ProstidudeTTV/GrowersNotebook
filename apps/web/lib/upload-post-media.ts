import type { SupabaseClient } from "@supabase/supabase-js";

export const POST_MEDIA_BUCKET = "post-media";

const IMAGE_MAX = 8 * 1024 * 1024;
const VIDEO_MAX = 50 * 1024 * 1024;
const IMAGE_MAX_EDGE = 1600;
const IMAGE_TYPES = /^image\/(jpeg|png|webp|gif)$/i;
const VIDEO_TYPES = /^video\/(mp4|webm|quicktime)$/i;

/** Many mobile pickers leave `file.type` empty; infer from extension. */
function inferredImageMime(file: File): string | null {
  if (file.type && IMAGE_TYPES.test(file.type)) return file.type;
  const n = file.name.toLowerCase();
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
  return null;
}

function extForVideo(mime: string): string {
  if (/quicktime/i.test(mime)) return "mov";
  if (/webm/i.test(mime)) return "webm";
  return "mp4";
}

function blobToResizedJpegWithImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(width, height));
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
          if (!blob) reject(new Error("Could not encode image"));
          else resolve(blob);
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

async function blobToResizedJpeg(file: File): Promise<Blob> {
  /**
   * Prefer createImageBitmap only to honor EXIF orientation, then scale on
   * canvas in one draw. Pairs { resizeWidth, resizeHeight } on createImageBitmap
   * are not reliably uniform across browsers; canvas drawImage(dw, dh) is.
   */
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      try {
        const w = bmp.width;
        const h = bmp.height;
        const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(w, h));
        const tw = Math.max(1, Math.round(w * scale));
        const th = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement("canvas");
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not process image");
        ctx.drawImage(bmp, 0, 0, tw, th);
        const out = await new Promise<Blob | null>((res) =>
          canvas.toBlob((b) => res(b), "image/jpeg", 0.88),
        );
        if (!out) throw new Error("Could not encode image");
        if (out.size > IMAGE_MAX) {
          throw new Error(
            "Processed image is still too large. Try a smaller file.",
          );
        }
        return out;
      } finally {
        bmp.close();
      }
    } catch {
      /* Safari / some GIFs — Image() path */
    }
  }
  return blobToResizedJpegWithImage(file);
}

export type UploadPostMediaResult =
  | { ok: true; publicUrl: string }
  | { ok: false; message: string };

export async function uploadPostImage(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<UploadPostMediaResult> {
  if (!inferredImageMime(file)) {
    return { ok: false, message: "Use a JPEG, PNG, WebP, or GIF image." };
  }
  if (file.size > IMAGE_MAX) {
    return { ok: false, message: "Image must be 8 MB or smaller." };
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
  if (blob.size > IMAGE_MAX) {
    return {
      ok: false,
      message: "Processed image is still too large. Try a smaller file.",
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
  if (!VIDEO_TYPES.test(file.type)) {
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
  const ext = extForVideo(file.type);
  const path = `${userId}/${id}.${ext}`;

  const { error } = await supabase.storage
    .from(POST_MEDIA_BUCKET)
    .upload(path, file, {
      contentType: file.type,
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

function uploadErrorMessage(msg: string): string {
  const m = msg ?? "Upload failed";
  if (/bucket|not found|404/i.test(m)) {
    return "Media storage is not set up yet. Run the `post-media` storage migration (Supabase SQL).";
  }
  if (/policy|denied|403|row-level security/i.test(m)) {
    return "Upload was blocked. Sign out and back in, or check storage policies for `post-media`.";
  }
  return m;
}
