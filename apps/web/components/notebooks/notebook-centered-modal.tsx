"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Full-viewport dimmed overlay with a centered panel (catalog-review look, not catalog detail slide-over).
 */
export function NotebookCenteredModal({
  open,
  title,
  children,
  footer,
  onClose,
  maxWidthClassName = "max-w-lg",
}: {
  open: boolean;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  /** Tailwind max-width, e.g. max-w-lg / max-w-xl */
  maxWidthClassName?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Dialog"}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        className={`relative z-10 max-h-[min(90vh,720px)] w-full ${maxWidthClassName} overflow-hidden rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] text-[var(--gn-text)] shadow-xl`}
      >
        {title ? (
          <div className="border-b border-[var(--gn-divide)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--gn-text)]">{title}</h2>
          </div>
        ) : null}
        <div className="max-h-[min(calc(90vh-4rem),640px)] overflow-y-auto">
          {children}
        </div>
        {footer ? (
          <div className="border-t border-[var(--gn-divide)] px-4 py-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
