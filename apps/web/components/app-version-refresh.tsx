"use client";

import { useEffect } from "react";

const STORAGE_KEY = "gn-app-build-id";
const POLL_MS = 120_000;

/**
 * After a deploy, the new bundle can serve a different build id; reload once so users pick up the site.
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

    void check();
    const timer = window.setInterval(check, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
