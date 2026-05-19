import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NotificationsPanel } from "@/components/notifications-panel";
import { SkeletonNotifList } from "@/components/skeletons";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/notifications");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--gn-accent)]">
        Notifications
      </h1>
      <p className="mt-2 text-sm text-[var(--gn-text-muted)]">
        Your recent activity and mentions.
      </p>
      <div className="mt-6">
        <Suspense fallback={<SkeletonNotifList />}>
          <NotificationsPanel />
        </Suspense>
      </div>
    </main>
  );
}
