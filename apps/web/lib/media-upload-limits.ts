/** Shared client upload caps — keep in sync with `post-media` Supabase bucket migration. */

/** Max bytes accepted from the device before client-side resize (photos). */
export const POST_IMAGE_INPUT_MAX_BYTES = 32 * 1024 * 1024;

/** Target max bytes for stored JPEG after scrub (social-quality). */
export const POST_IMAGE_STORED_MAX_BYTES = 12 * 1024 * 1024;

/** Longest edge after resize — balances feed quality and mobile bandwidth. */
export const POST_IMAGE_MAX_EDGE = 2048;

/** Raw video upload cap (phones often produce 50–90 MB clips). */
export const POST_VIDEO_MAX_BYTES = 100 * 1024 * 1024;

/** Supabase `post-media` bucket `file_size_limit` (must match migration). */
export const POST_MEDIA_BUCKET_MAX_BYTES = 128 * 1024 * 1024;

export function formatUploadMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(0)} MB`;
}

export const POST_IMAGE_INPUT_LABEL = formatUploadMegabytes(
  POST_IMAGE_INPUT_MAX_BYTES,
);
export const POST_IMAGE_STORED_LABEL = formatUploadMegabytes(
  POST_IMAGE_STORED_MAX_BYTES,
);
export const POST_VIDEO_MAX_LABEL = formatUploadMegabytes(POST_VIDEO_MAX_BYTES);
