"use client";

import { useEffect } from "react";

/**
 * Centered image overlay (Messenger-style), unlike catalog modals that slide from the side.
 * Image is capped so it never fills the viewport on mobile or desktop.
 */
export function DmImageLightbox({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
        aria-label="Close image"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-[min(92vw,960px)]"
        role="dialog"
        aria-modal="true"
        aria-label="Enlarged message image"
      >
        <button
          type="button"
          className="absolute right-1 top-1 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface)] text-[var(--gn-text)] shadow-md transition hover:bg-[var(--gn-surface-hover)] sm:right-2 sm:top-2"
          aria-label="Close"
          onClick={onClose}
        >
          <span aria-hidden className="text-xl leading-none">
            ×
          </span>
        </button>
        <div className="flex max-h-[min(85vh,800px)] items-center justify-center overflow-hidden rounded-xl bg-[var(--gn-surface-muted)] pt-9 shadow-2xl sm:pt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Message attachment"
            className="max-h-[min(85vh,800px)] max-w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
