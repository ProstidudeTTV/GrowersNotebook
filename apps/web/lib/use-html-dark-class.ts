"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  const el = document.documentElement;
  const mo = new MutationObserver(onStoreChange);
  mo.observe(el, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

/** Matches app default: `globals.css` documents `html.dark` as the primary theme. */
function getServerSnapshot() {
  return true;
}

export function useHtmlDarkClass(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
