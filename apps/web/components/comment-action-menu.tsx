"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function CommentActionMenu({
  ariaLabel = "Comment actions",
  children,
}: {
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const updatePos = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuW = menuRef.current?.offsetWidth ?? 144;
      let left = rect.right - menuW;
      left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
      setMenuPos({ top: rect.bottom + 4, left });
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    const onDoc = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu =
    open && menuPos ? (
      <div
        ref={menuRef}
        className="gn-menu fixed z-[200] min-w-[9rem] overflow-hidden py-1 shadow-lg"
        style={{ top: menuPos.top, left: menuPos.left }}
        role="menu"
      >
        <div onClick={() => setOpen(false)}>{children}</div>
      </div>
    ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-lg leading-none text-[var(--gn-text-muted)] transition hover:bg-[color-mix(in_srgb,var(--gn-accent)_12%,var(--gn-surface-muted))] hover:text-[var(--gn-text)]"
      >
        ⋮
      </button>
      {typeof document !== "undefined" && menu
        ? createPortal(menu, document.body)
        : null}
    </>
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
