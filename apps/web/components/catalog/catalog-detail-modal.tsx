"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

export function CatalogDetailModal({
  children,
  fullPageHref,
  title,
  /** When set (e.g. list preview via query params), closing does not use history.back() */
  onClose,
}: {
  children: React.ReactNode;
  fullPageHref: string;
  /** Shown on the overlay for assistive tech */
  title?: string;
  onClose?: () => void;
}) {
  const router = useRouter();
  const dismissBusy = useRef(false);

  const defaultClose = useCallback(() => {
    router.back();
  }, [router]);

  const close = useCallback(() => {
    if (dismissBusy.current) return;
    dismissBusy.current = true;
    try {
      if (onClose) onClose();
      else defaultClose();
    } finally {
      window.setTimeout(() => {
        dismissBusy.current = false;
      }, 400);
    }
  }, [onClose, defaultClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex justify-center sm:justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Close details"
        onClick={close}
      />

      <div
        className="relative flex h-full w-full max-w-6xl flex-col border-l border-[var(--gn-divide)] bg-[var(--gn-surface)] shadow-2xl sm:my-0 sm:max-h-full sm:rounded-l-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title?.trim() || "Details"}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--gn-divide)] px-4 py-3">
          <Link
            href={fullPageHref}
            className="text-xs font-medium text-[var(--gn-text-muted)] transition hover:text-[#ff6a38]"
          >
            Open full page
          </Link>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)]"
            aria-label="Close"
            onClick={close}
          >
            <span aria-hidden className="text-xl leading-none">
              ×
            </span>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
