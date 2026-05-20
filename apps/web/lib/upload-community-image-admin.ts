import axios from "axios";
import { adminAxios } from "@/lib/admin-axios";
import { adminApiErrorMessage } from "@/lib/admin-api-error";
import { uploadCommunityBanner } from "@/lib/upload-community-banner";
import { uploadCommunityIcon } from "@/lib/upload-community-icon";

export type CommunityImageKind = "banner" | "icon";

async function uploadViaBrowserStorage(
  file: File,
  communitySlug: string,
  kind: CommunityImageKind,
): Promise<string> {
  if (kind === "icon") {
    return uploadCommunityIcon(file, communitySlug);
  }
  return uploadCommunityBanner(file, communitySlug);
}

/**
 * Upload community banner/icon — prefers Nest admin API (service role), falls back
 * to signed-in browser upload when API storage env is missing (503).
 */
export async function uploadCommunityImageAdmin(
  file: File,
  communitySlug: string,
  kind: CommunityImageKind,
): Promise<string> {
  const slug = communitySlug.trim();
  if (!slug) {
    throw new Error("Community slug is required to upload images.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("slug", slug);
  form.append("kind", kind);

  try {
    const res = await adminAxios.post<{ url: string }>(
      "/communities/upload-image",
      form,
    );
    const url = res.data?.url?.trim();
    if (!url?.startsWith("https://")) {
      throw new Error("Upload succeeded but no public URL was returned.");
    }
    return url;
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    const msg = adminApiErrorMessage(err, "Upload failed.");
    const storageUnavailable =
      status === 503 ||
      /storage is not configured|not configured/i.test(msg);

    if (storageUnavailable) {
      try {
        return await uploadViaBrowserStorage(file, slug, kind);
      } catch (fallbackErr) {
        throw new Error(
          `${msg} Browser fallback also failed: ${
            fallbackErr instanceof Error ? fallbackErr.message : "unknown error"
          }. Ensure SUPABASE_SERVICE_ROLE_KEY is set on the API service, or your profile role is admin in Supabase.`,
        );
      }
    }

    if (status === 403) {
      throw new Error(
        "Only site admins can upload community images. Your account may be a moderator, or the API rejected the session.",
      );
    }

    throw new Error(msg);
  }
}
