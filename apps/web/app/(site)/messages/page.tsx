import { MessagesPanel } from "@/components/messages-panel";

export default function MessagesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-[#ff6a38]">
        Messages
      </h1>
      <p className="mt-2 text-sm text-[var(--gn-text-muted)]">
        Direct messages and group chats. End-to-end encryption may be available
        depending on room settings.
      </p>
      <div className="mt-6">
        <MessagesPanel />
      </div>
    </main>
  );
}
