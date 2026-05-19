import { MessagesPanel } from "@/components/messages-panel";
import { Suspense } from "react";

export default function MessagesPage() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
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
