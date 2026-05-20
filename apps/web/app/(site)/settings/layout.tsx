import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import { SettingsNav } from "./settings-nav";

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const token = await getAccessTokenForApi(supabase);
  if (!token) {
    redirect("/login?next=/settings/profile");
  }
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="grid gap-6 md:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="md:sticky md:top-24 md:self-start">
          <SettingsNav />
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}
