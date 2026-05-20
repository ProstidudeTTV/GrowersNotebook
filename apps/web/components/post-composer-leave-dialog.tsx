"use client";

type PostComposerLeaveDialogProps = {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
};

/** Confirms navigation away from an open post composer without losing draft on Stay. */
export function PostComposerLeaveDialog({
  open,
  onStay,
  onLeave,
}: PostComposerLeaveDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="composer-leave-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close dialog"
        onClick={onStay}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-elevated)] p-6 shadow-2xl">
        <h2
          id="composer-leave-title"
          className="text-lg font-bold text-[var(--gn-text)]"
        >
          Keep working on your post?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--gn-text-muted)]">
          You have a post in progress. Stay here to keep your draft, or leave
          and discard it.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onStay}
            className="rounded-full bg-[var(--gn-accent)] px-5 py-2 text-sm font-bold text-[var(--gn-on-accent)] transition hover:brightness-110"
          >
            Keep writing
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-full border border-[var(--gn-border)] px-5 py-2 text-sm font-medium text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)]"
          >
            Leave &amp; discard
          </button>
        </div>
      </div>
    </div>
  );
}
