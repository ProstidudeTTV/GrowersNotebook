"use client";

import EmojiPicker, {
  Theme,
  type EmojiClickData,
} from "emoji-picker-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

function FaceSmileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75h.008v.008H9.75V9.75zm4.5 0h.008v.008h-.008V9.75z"
      />
    </svg>
  );
}

function useDocumentDark(): boolean {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const read = () =>
      setDark(document.documentElement.classList.contains("dark"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export function FullEmojiPickerButton({
  onPick,
  disabled,
  ariaLabel = "Open emoji picker",
}: {
  onPick: (emoji: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const menuId = useId();
  const dark = useDocumentDark();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      const t = e.target;
      if (t instanceof Node && !el.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);

  const onEmojiClick = useCallback(
    (data: EmojiClickData) => {
      onPick(data.emoji);
      setOpen(false);
    },
    [onPick],
  );

  return (
    <div ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        disabled={disabled}
        className="inline-flex items-center gap-1 rounded-md border border-[var(--gn-divide)] px-2 py-0.5 text-xs font-semibold text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)] disabled:opacity-40"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? menuId : undefined}
        title="Browse all emojis"
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <FaceSmileIcon className="h-4 w-4 shrink-0 opacity-90" />
        <span>All</span>
      </button>
      {open ? (
        <div
          id={menuId}
          className="absolute left-0 top-[calc(100%+6px)] z-[200] max-[min(100vw-1rem,320px)] overflow-hidden rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-elevated)] shadow-lg"
          role="dialog"
          aria-label="Emoji picker"
        >
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            theme={dark ? Theme.DARK : Theme.LIGHT}
            width={320}
            height={420}
            lazyLoadEmojis
            previewConfig={{ showPreview: false }}
            searchPlaceHolder="Search emojis"
          />
        </div>
      ) : null}
    </div>
  );
}
