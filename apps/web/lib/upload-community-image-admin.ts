import { adminAxios } from "@/lib/admin-axios";

export type CommunityImageKind = "banner" | "icon";

/**
 * Upload community banner/icon via Nest admin API (service role).
 * Avoids Supabase Storage RLS that only allows direct client uploads when
 * `profiles.role = admin` matches `auth.uid()` in the browser session.
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

  const staff = await adminAxios.get<{
    role: string;
    isAdmin: boolean;
    displayName: string | null;
  }>("/me");
  if (!staff.data.isAdmin) {
    throw new Error(
      `Only site admins can upload community images (your role: ${staff.data.role}).`,
    );
  }

  const form = new FormData();
  form.append("file", file);
  form.append("slug", slug);
  form.append("kind", kind);
  const res = await adminAxios.post<{ url: string }>(
    "/communities/upload-image",
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  const url = res.data?.url?.trim();
  if (!url?.startsWith("https://")) {
    throw new Error("Upload succeeded but no public URL was returned.");
  }
  return url;
}
