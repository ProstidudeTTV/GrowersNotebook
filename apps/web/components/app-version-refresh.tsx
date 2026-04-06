"use client";

import { useEffect } from "react";

const STORAGE_KEY = "gn-app-build-id";
const POLL_MS = 300_000;

function scheduleIdle(fn: () => void, timeout: number) {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(fn, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, timeout);
  return () => window.clearTimeout(id);
}

/**
 * After a deploy, the new bundle can serve a different build id; reload once so users pick up the site.
 * Deferred so it does not compete with first paint or API calls.
 */
export function AppVersionRefresh() {
  useEffect(() => {
    let stopped = false;

    const check = async () => {
      if (stopped) return;
      try {
        const res = await fetch("/api/build-info", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { id?: string };
        const id = data.id ?? "";
        if (!id || id === "development") return;
        const prev =
          typeof window.sessionStorage !== "undefined"
            ? window.sessionStorage.getItem(STORAGE_KEY)
            : null;
        if (prev && prev !== id) {
          window.sessionStorage.setItem(STORAGE_KEY, id);
          window.location.reload();
          return;
        }
        window.sessionStorage.setItem(STORAGE_KEY, id);
      } catch {
        /* ignore */
      }
    };

    const cancelIdle = scheduleIdle(() => void check(), 3500);
    const timer = window.setInterval(check, POLL_MS);
    return () => {
      stopped = true;
      cancelIdle();
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
