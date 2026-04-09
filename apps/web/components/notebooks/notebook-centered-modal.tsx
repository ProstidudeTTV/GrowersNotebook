"use client";

import { ConfigProvider, theme } from "antd";
import { useEffect, useRef, type ReactNode } from "react";
import { useHtmlDarkClass } from "@/lib/use-html-dark-class";

/**
 * Full-viewport dimmed overlay with a centered panel (catalog-review look, not catalog detail slide-over).
 */
export function NotebookCenteredModal({
  open,
  title,
  children,
  footer,
  onClose,
  maxWidthClassName = "max-w-3xl",
}: {
  open: boolean;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  /** Tailwind max-width, e.g. max-w-3xl / max-w-4xl */
  maxWidthClassName?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const isDark = useHtmlDarkClass();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const antdTheme = {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: isDark
      ? {
          colorPrimary: "#ff6b35",
          colorBgContainer: "#191c24",
          colorBgElevated: "#1e222b",
          colorBorder: "rgba(230, 235, 255, 0.11)",
          colorBorderSecondary: "rgba(230, 235, 255, 0.07)",
          colorText: "#eceef3",
          colorTextSecondary: "#9aa3b5",
          colorTextTertiary: "#9aa3b5",
          colorTextPlaceholder: "#7a8194",
          colorFillAlter: "rgba(255, 255, 255, 0.04)",
        }
      : {
          colorPrimary: "#c2410c",
          colorBgContainer: "#ffffff",
          colorBgElevated: "#f5f7fb",
          colorBorder: "rgba(30, 41, 59, 0.11)",
          colorBorderSecondary: "rgba(30, 41, 59, 0.08)",
          colorText: "#0c1222",
          colorTextSecondary: "#5c6578",
          colorTextTertiary: "#6b7287",
          colorTextPlaceholder: "#9ca3af",
          colorFillAlter: "rgba(30, 41, 59, 0.03)",
        },
    components: {
      Input: {
        activeShadow: isDark
          ? "0 0 0 2px rgba(255, 107, 53, 0.2)"
          : "0 0 0 2px rgba(194, 65, 12, 0.15)",
      },
      Select: {
        optionSelectedBg: isDark
          ? "rgba(255, 107, 53, 0.18)"
          : "rgba(194, 65, 12, 0.1)",
      },
    },
  };

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
        ref={panelRef}
        className={`relative z-10 max-h-[min(94vh,920px)] w-full ${maxWidthClassName} overflow-hidden rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] text-[var(--gn-text)] shadow-xl`}
      >
        <ConfigProvider
          theme={antdTheme}
          getPopupContainer={() =>
            panelRef.current ?? document.body
          }
        >
          {title ? (
            <div className="border-b border-[var(--gn-divide)] px-5 py-4">
              <h2 className="text-base font-semibold text-[var(--gn-text)]">
                {title}
              </h2>
            </div>
          ) : null}
          <div className="max-h-[min(calc(94vh-5rem),860px)] overflow-y-auto">
            {children}
          </div>
          {footer ? (
            <div className="border-t border-[var(--gn-divide)] px-4 py-3">
              {footer}
            </div>
          ) : null}
        </ConfigProvider>
      </div>
    </div>
  );
}
