"use client";

import DOMPurify from "dompurify";
import { displayPostBodyHtml } from "@/lib/youtube-embed";

export function sanitizeDisplayedPostHtml(bodyHtml: string): string {
  const expanded = displayPostBodyHtml(bodyHtml);
  return DOMPurify.sanitize(expanded, {
    ADD_TAGS: ["iframe", "div"],
    ADD_ATTR: [
      "allow",
      "allowfullscreen",
      "class",
      "data-revealed",
      "data-spoiler",
      "frameborder",
      "loading",
      "playsinline",
      "preload",
      "referrerpolicy",
      "src",
      "title",
    ],
    ALLOW_DATA_ATTR: true,
  });
}
