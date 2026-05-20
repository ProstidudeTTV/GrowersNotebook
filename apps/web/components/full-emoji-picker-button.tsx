"use client";

import EmojiPicker, {
  Theme,
  type EmojiClickData,
} from "emoji-picker-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

const PICKER_W = 320;
const PICKER_H = 420;

export function FullEmojiPickerButton({
  onPick,
  disabled,
  ariaLabel = "Open emoji picker",
  buttonClassName,
  showLabel = true,
  /** Open above trigger (for bottom compose bars). */
  placement = "below",
  /** Portal to document.body so overflow-hidden ancestors do not clip the picker. */
  usePortal = false,
}: {
  onPick: (emoji: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  buttonClassName?: string;
  showLabel?: boolean;
  placement?: "above" | "below";
  usePortal?: boolean;
}) {
  const menuId = useId();
  const dark = useDocumentDark();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [portalPos, setPortalPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const updatePortalPos = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const gap = 6;
  const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove =
      placement === "above" || spaceBelow < PICKER_H + gap + 16;
    const top = openAbove
      ? Math.max(8, rect.top - PICKER_H - gap)
      : rect.bottom + gap;
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - PICKER_W - 8,
    );
    setPortalPos({ top, left });
  }, [placement]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const wrap = wrapRef.current;
      const picker = document.getElementById(menuId);
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (wrap?.contains(t)) return;
      if (picker?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open, menuId]);

  useEffect(() => {
    if (!open || !usePortal) return;
    updatePortalPos();
    const onScroll = () => updatePortalPos();
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, usePortal, updatePortalPos]);

  const onEmojiClick = useCallback(
    (data: EmojiClickData) => {
      onPick(data.emoji);
      setOpen(false);
    },
    [onPick],
  );

  const pickerPanel = open ? (
    <div
      id={menuId}
      className={
        usePortal
          ? "fixed z-[300] max-w-[min(100vw-1rem,320px)] overflow-hidden rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-elevated)] shadow-lg"
          : [
              "absolute left-0 z-[200] max-w-[min(100vw-1rem,320px)] overflow-hidden rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-elevated)] shadow-lg",
              placement === "above"
                ? "bottom-[calc(100%+6px)]"
                : "top-[calc(100%+6px)]",
            ].join(" ")
      }
      style={
        usePortal && portalPos
          ? { top: portalPos.top, left: portalPos.left }
          : undefined
      }
      role="dialog"
      aria-label="Emoji picker"
    >
      <EmojiPicker
        onEmojiClick={onEmojiClick}
        theme={dark ? Theme.DARK : Theme.LIGHT}
        width={PICKER_W}
        height={PICKER_H}
        lazyLoadEmojis
        previewConfig={{ showPreview: false }}
        searchPlaceHolder="Search emojis"
      />
    </div>
  ) : null;

  return (
    <div ref={wrapRef} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        className={[
          showLabel
            ? "inline-flex items-center gap-1 rounded-md border border-[var(--gn-divide)] px-2 py-0.5 text-xs font-semibold text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)] disabled:opacity-40"
            : "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--gn-text-muted)] transition hover:bg-[var(--gn-surface-hover)] disabled:opacity-40",
          buttonClassName ?? "",
        ]
          .join(" ")
          .trim()}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? menuId : undefined}
        title="Browse all emojis"
        aria-label={ariaLabel}
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next && usePortal) {
              requestAnimationFrame(() => updatePortalPos());
            }
            return next;
          });
        }}
      >
        <FaceSmileIcon
          className={
            showLabel
              ? "h-4 w-4 shrink-0 opacity-90"
              : "h-[1.35rem] w-[1.35rem] shrink-0 opacity-90"
          }
        />
        {showLabel ? <span>All</span> : null}
      </button>
      {usePortal && typeof document !== "undefined"
        ? createPortal(pickerPanel, document.body)
        : pickerPanel}
    </div>
  );
}
