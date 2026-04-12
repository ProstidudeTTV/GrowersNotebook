import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicApiUrl } from "@/lib/public-api-url";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

/** Site settings (including SEO) are admin-only; moderators must not open this route. */
export default async function AdminSiteSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const token = await getAccessTokenForApi(supabase);
  if (!token) redirect("/login?next=/admin/site-settings");

  const api = getPublicApiUrl();
  let meRes: Response;
  try {
    meRes = await fetch(`${api}/profiles/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    redirect("/admin");
  }
  if (!meRes.ok) redirect("/admin");

  const profile = (await meRes.json()) as { role: string };
  if (profile.role !== "admin") redirect("/admin");

  return <>{children}</>;
}
