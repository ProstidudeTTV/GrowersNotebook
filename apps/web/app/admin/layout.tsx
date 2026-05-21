import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicApiUrl } from "@/lib/public-api-url";
import { RefineAdminLayout } from "./refine-admin-layout";

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  let {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    session = refreshed.session;
  }
  const token = session?.access_token;
  if (!token) redirect("/login?next=/admin");

  const api = getPublicApiUrl();
  let meRes: Response;
  try {
    meRes = await fetch(`${api}/profiles/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    redirect("/?admin_error=api_unreachable");
  }

  if (meRes.status === 401) redirect("/login?next=/admin");
  if (meRes.status === 403) redirect("/?admin_error=forbidden");
  if (!meRes.ok) redirect("/?admin_error=api");

  const profile = (await meRes.json()) as {
    id: string;
    role: string;
    displayName: string | null;
  };
  if (
    profile.role !== "admin" &&
    profile.role !== "moderator" &&
    profile.role !== "owner"
  ) {
    redirect("/?admin_error=not_staff");
  }

  return (
    <RefineAdminLayout
      initialStaff={{
        userId: profile.id || user.id,
        displayName: profile.displayName,
        role: profile.role as "admin" | "moderator" | "owner",
      }}
    >
      {children}
    </RefineAdminLayout>
  );
}
