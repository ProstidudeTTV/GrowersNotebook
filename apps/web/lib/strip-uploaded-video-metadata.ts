import { apiFetch } from "@/lib/api-public";

/** Best-effort server-side ffmpeg remux after upload (drops most container metadata). */
export async function stripUploadedVideoMetadata(
  token: string,
  path: string,
  contentType: "video/mp4" | "video/webm" | "video/quicktime",
): Promise<void> {
  await apiFetch("/media/post-media/strip-video-metadata", {
    method: "POST",
    token,
    body: JSON.stringify({ path, contentType }),
  });
}
