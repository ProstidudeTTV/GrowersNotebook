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

/** Heuristic: detect API saying "storage is not configured" so the browser
 * fallback only kicks in when the API genuinely can't reach Supabase storage,
 * NOT when the proxy or auth is broken. */
function isApiStorageMissing(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  if (err.response?.status !== 503) return false;
  const data = err.response?.data;
  const text =
    typeof data === "string"
      ? data
      : data && typeof data === "object" && "message" in data
        ? String((data as { message?: unknown }).message ?? "")
        : "";
  return /storage is not configured|service role|SUPABASE_SERVICE_ROLE/i.test(
    text,
  );
}

/**
 * Upload community banner/icon — prefers Nest admin API (service role), falls
 * back to signed-in browser upload only when the API genuinely cannot reach
 * Supabase storage. Other 503s (proxy missing API URL) are surfaced directly
 * so the user knows which service to fix.
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

    if (isApiStorageMissing(err)) {
      try {
        return await uploadViaBrowserStorage(file, slug, kind);
      } catch (fallbackErr) {
        const fbMsg =
          fallbackErr instanceof Error
            ? fallbackErr.message
            : "unknown error";
        throw new Error(
          `API upload failed: ${msg}\nBrowser-direct fallback also failed: ${fbMsg}\nFix: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on growers-notebook-api.`,
        );
      }
    }

    if (status === 502 || status === 503) {
      throw new Error(
        `${msg}\nThis is usually the web service missing NEXT_PUBLIC_API_URL. Open /admin/health for a per-layer diagnostic.`,
      );
    }

    if (status === 401) {
      throw new Error(
        "Sign-in expired during upload. Refresh the page and try again.",
      );
    }

    if (status === 403) {
      throw new Error(
        "Forbidden — only admins can upload community images. Verify your profile role.",
      );
    }

    if (status === 400) {
      throw new Error(msg);
    }

    throw new Error(msg);
  }
}
