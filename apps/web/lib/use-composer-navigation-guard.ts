"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/**
 * Blocks in-app link clicks while the composer is open; shows a confirm step
 * before navigating away (caller renders dialog).
 */
export function useComposerNavigationGuard({
  active,
  composerRootRef,
}: {
  active: boolean;
  composerRootRef: React.RefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!active) {
      setPendingHref(null);
      return;
    }
    const onClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const root = composerRootRef.current;
      if (root?.contains(target)) return;
      const anchor = target.closest("a[href]");
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (href.startsWith("http") && !href.startsWith(window.location.origin)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active, composerRootRef]);

  const dismiss = useCallback(() => setPendingHref(null), []);

  const confirmLeave = useCallback(
    (onDiscard: () => void) => {
      const href = pendingHref;
      if (!href) return;
      setPendingHref(null);
      onDiscard();
      if (href.startsWith("/")) {
        router.push(href);
      } else {
        window.location.assign(href);
      }
    },
    [pendingHref, router],
  );

  return {
    leaveDialogOpen: pendingHref != null,
    dismissLeaveDialog: dismiss,
    confirmLeave,
  };
}
