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
        and use Message on their profile. Messages are private to participants
        and protected in transit; Growers can access content when needed for
        safety and operations (similar to default Messenger—not Signal-style
        end-to-end encryption from the service).
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
