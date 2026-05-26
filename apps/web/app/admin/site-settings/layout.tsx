import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicApiUrl } from "@/lib/public-api-url";
import { getSiteUrl } from "@/lib/site-config";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import { isAdminRole } from "@/lib/staff-role";

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
      headers: {
        Authorization: `Bearer ${token}`,
        Origin: getSiteUrl(),
      },
      cache: "no-store",
    });
  } catch {
    redirect("/admin");
  }
  if (!meRes.ok) redirect("/admin");

  const profile = (await meRes.json()) as { role: string };
  if (!isAdminRole(profile.role)) redirect("/admin");

  return <>{children}</>;
}
