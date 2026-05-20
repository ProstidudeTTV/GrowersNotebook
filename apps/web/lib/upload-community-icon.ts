import { COMMUNITY_BANNER_BUCKET, uploadCommunityBanner } from "@/lib/upload-community-banner";

/**
 * Uploads a square community icon to the `community-banners` bucket under
 * `{slug}/icon-{timestamp}-{name}` and returns the public URL.
 */
export async function uploadCommunityIcon(
  file: File,
  communitySlug: string,
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const iconFile = new File([file], `icon-${safeName}`, { type: file.type });
  const url = await uploadCommunityBanner(iconFile, communitySlug);
  return url;
}

export { COMMUNITY_BANNER_BUCKET };
