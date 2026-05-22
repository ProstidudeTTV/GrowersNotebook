"use client";

type Props = {
  open: boolean;
  title?: string;
  onStay: () => void;
  onLeave: () => void;
};

/** Confirms closing a notebook wizard without saving. */
export function NotebookWizardLeaveDialog({
  open,
  title = "Discard journal entry?",
  onStay,
  onLeave,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-leave-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close dialog"
        onClick={onStay}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-elevated)] p-6 shadow-2xl">
        <h2
          id="wizard-leave-title"
          className="text-lg font-bold text-[var(--gn-text)]"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--gn-text-muted)]">
          You have unsaved changes in this wizard. Stay to keep editing, or leave
          and lose what you entered.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onStay}
            className="rounded-full bg-[var(--gn-accent)] px-5 py-2 text-sm font-bold text-[var(--gn-on-accent)] transition hover:brightness-110"
          >
            Keep editing
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
