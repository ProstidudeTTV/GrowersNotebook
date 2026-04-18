/**
 * Re-encode images through Canvas so source EXIF / embedded metadata is not copied
 * into the output JPEG (browser `toBlob("image/jpeg")` does not embed original EXIF).
 */

export type ScrubbedJpegOptions = {
  maxEdge: number;
  maxBytes: number;
  jpegQuality?: number;
};

function blobToResizedJpegWithImage(
  file: File,
  maxEdge: number,
  jpegQuality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const scale = Math.min(1, maxEdge / Math.max(width, height));
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
        jpegQuality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

async function decodeFileToJpegBlob(
  file: File,
  maxEdge: number,
  jpegQuality: number,
): Promise<Blob> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      try {
        const w = bmp.width;
        const h = bmp.height;
        const scale = Math.min(1, maxEdge / Math.max(w, h));
        const tw = Math.max(1, Math.round(w * scale));
        const th = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement("canvas");
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not process image");
        ctx.drawImage(bmp, 0, 0, tw, th);
        const out = await new Promise<Blob | null>((res) =>
          canvas.toBlob((b) => res(b), "image/jpeg", jpegQuality),
        );
        if (!out) throw new Error("Could not encode image");
        return out;
      } finally {
        bmp.close();
      }
    } catch {
      /* Safari / some GIFs — Image() path */
    }
  }
  return blobToResizedJpegWithImage(file, maxEdge, jpegQuality);
}

/**
 * Decode → scale → JPEG. Enforces maxBytes on the encoded blob.
 */
export async function fileToScrubbedJpegBlob(
  file: File,
  opts: ScrubbedJpegOptions,
): Promise<Blob> {
  const q = opts.jpegQuality ?? 0.88;
  const blob = await decodeFileToJpegBlob(file, opts.maxEdge, q);
  if (blob.size > opts.maxBytes) {
    const isAvatar = opts.maxBytes <= 2 * 1024 * 1024 && opts.maxEdge <= 512;
    throw new Error(
      isAvatar
        ? "Processed image is still too large. Try a smaller original."
        : "Processed image is still too large. Try a smaller file.",
    );
  }
  return blob;
}
