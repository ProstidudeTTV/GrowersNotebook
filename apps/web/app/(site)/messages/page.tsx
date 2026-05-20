import { MessagesPanel } from "@/components/messages-panel";
import { createClient } from "@/lib/supabase/server";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function MessagesPage() {
  const supabase = await createClient();
  const token = await getAccessTokenForApi(supabase);
  if (!token) {
    redirect("/login?next=/messages");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <h1 className="sr-only">Messages</h1>
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-[var(--gn-text-muted)]">Loading…</p>
          </div>
        }
      >
        <MessagesPanel />
      </Suspense>
    </div>
  );
}
