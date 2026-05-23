"use client";

import { MediaPreviewGrid } from "@/components/media-preview-grid";
import { isDmVideoUrl } from "@/lib/dm-media-url";

export type DmStackImageSize = "compact" | "default" | "large";

function MediaThumb({
  url,
  className,
}: {
  url: string;
  className: string;
}) {
  if (isDmVideoUrl(url)) {
    return (
      <video
        src={url}
        muted
        playsInline
        preload="metadata"
        className={className}
        aria-label="Video clip"
      />
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={url} alt="" className={className} loading="lazy" />
  );
}

/**
 * Comment/DM attachments: grid preview (2+) or single tap-to-expand tile.
 * Opens parent `MediaViewer` via `onOpen(index)`.
 */
export function StackedDmStyleImages({
  urls,
  stackKey,
  pileLabel,
  onOpen,
  compact = false,
  size,
  className = "",
}: {
  urls: string[];
  stackKey: string;
  pileLabel?: string | null;
  onOpen: (index: number) => void;
  /** @deprecated Prefer `size` */
  compact?: boolean;
  size?: DmStackImageSize;
  className?: string;
}) {
  const imgs = urls.filter(Boolean);
  if (imgs.length === 0) return null;

  const resolvedSize: DmStackImageSize =
    size ?? (compact ? "compact" : "default");

  if (imgs.length >= 2) {
    return (
      <div className={className}>
        {pileLabel ? (
          <p className="mb-1.5 text-sm font-medium text-[var(--gn-text-muted)]">
            {pileLabel}
          </p>
        ) : null}
        <MediaPreviewGrid
          urls={imgs}
          onOpen={onOpen}
          maxCells={4}
          className={
            resolvedSize === "compact"
              ? "max-w-[min(100%,20rem)]"
              : resolvedSize === "large"
                ? "max-w-full"
                : "max-w-[min(100%,24rem)]"
          }
        />
      </div>
    );
  }

  const singleClass =
    resolvedSize === "large"
      ? "max-h-[min(70dvh,28rem)] w-full max-w-full cursor-zoom-in rounded-xl object-cover object-center sm:max-h-[32rem]"
      : resolvedSize === "compact"
        ? "h-24 w-24 max-w-full cursor-zoom-in rounded-lg object-cover object-center sm:h-28 sm:w-28"
        : "max-h-64 w-full max-w-[min(100%,18rem)] cursor-zoom-in rounded-xl object-cover object-center";

  return (
    <div className={[`overflow-visible`, className].filter(Boolean).join(" ")}>
      {pileLabel ? (
        <p className="mb-1.5 text-sm font-medium text-[var(--gn-text-muted)]">
          {pileLabel}
        </p>
      ) : null}
      <button
        type="button"
        className="block max-w-full border-0 bg-transparent p-0"
        onClick={() => onOpen(0)}
        aria-label="Open attachment"
      >
        <span className="block overflow-hidden rounded-xl bg-[var(--gn-surface-muted)]">
          <MediaThumb url={imgs[0]!} className={singleClass} />
        </span>
      </button>
      <span className="sr-only" aria-hidden>
        {stackKey}
      </span>
    </div>
  );
}
