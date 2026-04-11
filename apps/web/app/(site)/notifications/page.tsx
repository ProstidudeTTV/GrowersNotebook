import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NotificationsPanel } from "@/components/notifications-panel";
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
      <h1 className="text-2xl font-bold tracking-tight text-[#ff4500]">
        Notifications
      </h1>
      <p className="mt-2 text-sm text-[var(--gn-text-muted)]">
        Replies, votes, notebook activity, and other updates. Click an unread
        item to mark it read.
      </p>
      <div className="mt-6">
        <Suspense
          fallback={
            <p className="text-sm text-[var(--gn-text-muted)]">Loading…</p>
          }
        >
          <NotificationsPanel />
        </Suspense>
      </div>
    </main>
  );
}
