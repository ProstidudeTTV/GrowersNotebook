"use client";

import { MediaPreviewGrid } from "@/components/media-preview-grid";

/** Comment/DM attachment grid — delegates to shared `MediaPreviewGrid`. */
export function CommentDmMediaGrid({
  urls,
  onOpen,
  className = "",
}: {
  urls: string[];
  onOpen: (index: number) => void;
  className?: string;
}) {
  return (
    <MediaPreviewGrid
      urls={urls}
      onOpen={onOpen}
      className={className}
      maxCells={4}
    />
  );
}
