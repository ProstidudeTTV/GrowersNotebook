"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { EmojiClickData } from "emoji-picker-react";
import { Theme } from "emoji-picker-react";

const EmojiPicker = dynamic(
  () => import("emoji-picker-react").then((m) => m.default),
  { ssr: false },
);

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
        className="rounded-md border border-[var(--gn-divide)] px-1.5 py-0.5 text-base leading-none transition hover:bg-[var(--gn-surface-hover)] disabled:opacity-40"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? menuId : undefined}
        title="More emojis"
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        {"\u{1F600}"}
      </button>
      {open ? (
        <div
          id={menuId}
          className="absolute left-0 top-[calc(100%+6px)] z-[80] max-[100vw] overflow-hidden rounded-xl border border-[var(--gn-border)] shadow-lg"
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
