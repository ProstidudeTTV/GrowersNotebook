import { MessagesPanel } from "@/components/messages-panel";
import { Suspense } from "react";

export default function MessagesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-[#ff6a38]">
        Messages
      </h1>
      <p className="mt-2 text-sm text-[var(--gn-text-muted)]">
        Your open conversations. To start a new chat, open someone you follow
        and use Message on their profile. Chats are end-to-end encrypted on the
        homeserver.
      </p>
      <div className="mt-6">
        <Suspense
          fallback={
            <p className="text-sm text-[var(--gn-text-muted)]">Loading…</p>
          }
        >
          <MessagesPanel />
        </Suspense>
      </div>
    </main>
  );
}
