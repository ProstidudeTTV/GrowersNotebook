import { createClient } from "@/lib/supabase/client";

export const COMMUNITY_BANNER_BUCKET = "community-banners";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Uploads a community banner image to the `community-banners` bucket and returns
 * the public URL. Throws a descriptive Error on invalid file or upload failure.
 *
 * Path: `${communitySlug}/${Date.now()}-${file.name}` — keeps history per community
 * so previous banners are not silently overwritten when admins iterate.
 */
export async function uploadCommunityBanner(
  file: File,
  communitySlug: string,
): Promise<string> {
  if (!file) {
    throw new Error("Choose an image file to upload.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Banner must be an image file (JPEG, PNG, WebP, or GIF).");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Banner image must be 5 MB or smaller.");
  }
  if (!communitySlug) {
    throw new Error("Community slug is required to upload a banner.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${communitySlug}/${Date.now()}-${safeName}`;

  const supabase = createClient();
  const { error: upErr } = await supabase.storage
    .from(COMMUNITY_BANNER_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (upErr) {
    const msg = upErr.message ?? "Upload failed";
    if (/bucket|not found|404/i.test(msg)) {
      throw new Error(
        "Banner storage is not set up. Run the `community-banners` bucket migration.",
      );
    }
    if (/policy|denied|403|row-level security/i.test(msg)) {
      throw new Error(
        "Upload was blocked. You must be signed in as an admin to upload community banners.",
      );
    }
    throw new Error(msg);
  }

  const { data } = supabase.storage
    .from(COMMUNITY_BANNER_BUCKET)
    .getPublicUrl(path);

  const publicUrl = data.publicUrl;
  if (!publicUrl?.startsWith("https://")) {
    throw new Error("Could not get public URL for the uploaded banner.");
  }
  return publicUrl;
}
