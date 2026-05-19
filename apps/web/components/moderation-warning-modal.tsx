"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  title: string;
  body: string;
  onClose: () => void;
};

/** Full text for moderation_warning notifications (site chrome, not admin). */
export function ModerationWarningModal({
  open,
  title,
  body,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="gn-panel m-auto w-[min(100%-2rem,30rem)] max-h-[min(90dvh,32rem)] border border-[var(--gn-ring)] p-0 backdrop:bg-black/50 open:flex open:flex-col"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--gn-divide)] px-5 py-4">
        <h2 className="text-base font-semibold text-[var(--gn-text)]">{title}</h2>
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-sm text-[var(--gn-text-muted)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-text)]"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="overflow-y-auto px-5 py-4">
        <p className="whitespace-pre-wrap text-sm text-[var(--gn-text)]">{body}</p>
      </div>
    </dialog>
  );
}
