import { MessagesPanel } from "@/components/messages-panel";

export default function MessagesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-[#ff6a38]">
        Messages
      </h1>
      <p className="mt-2 text-sm text-[var(--gn-text-muted)]">
        Matrix-powered direct messages and rooms (end-to-end encryption when
        enabled on the homeserver and room).
      </p>
      <div className="mt-6">
        <MessagesPanel />
      </div>
    </main>
  );
}
