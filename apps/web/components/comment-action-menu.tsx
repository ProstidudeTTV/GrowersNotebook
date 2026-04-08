"use client";

import { useEffect, useRef, useState } from "react";

export function CommentActionMenu({
  ariaLabel = "Comment actions",
  children,
}: {
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (root.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-lg leading-none text-[var(--gn-text-muted)] transition hover:bg-[color-mix(in_srgb,var(--gn-accent)_12%,var(--gn-surface-muted))] hover:text-[var(--gn-text)] hover:shadow-[0_0_12px_rgba(255,69,0,0.12)]"
      >
        ⋮
      </button>
      {open ? (
        <div
          className="gn-menu absolute right-0 top-full z-30 mt-1 min-w-[9rem] overflow-hidden py-1"
          role="menu"
        >
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      ) : null}
    </div>
  );
}

export function MenuRow({
  onClick,
  danger,
  disabled,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={
        danger
          ? "flex w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-45 dark:text-red-400 dark:hover:bg-red-950/50"
          : "flex w-full px-3 py-2 text-left text-sm text-[var(--gn-text)] hover:bg-[var(--gn-surface-muted)] hover:shadow-[inset_0_0_0_1px_var(--gn-border)] disabled:opacity-45"
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}
