"use client";

import { isDmVideoUrl } from "@/lib/dm-media-url";

function MediaCell({
  url,
  onOpen,
  className = "",
}: {
  url: string;
  onOpen?: () => void;
  className?: string;
}) {
  const video = isDmVideoUrl(url);
  const inner = video ? (
    <video
      src={url}
      muted
      playsInline
      preload="metadata"
      className="h-full w-full object-cover object-center"
      aria-label="Video"
    />
  ) : (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={url}
      alt=""
      className="h-full w-full object-cover object-center"
      loading="lazy"
    />
  );

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`relative block w-full overflow-hidden rounded-xl bg-[var(--gn-surface-muted)] ring-1 ring-[var(--gn-divide)] ${className}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      className={`relative block w-full overflow-hidden rounded-xl bg-[var(--gn-surface-muted)] ring-1 ring-[var(--gn-divide)] ${className}`}
    >
      {inner}
    </div>
  );
}

/** Facebook/Instagram-style crop grid for 1–4 images (feed, comments, DMs). */
export function MediaPreviewGrid({
  urls,
  onOpen,
  className = "",
  maxCells = 4,
}: {
  urls: string[];
  onOpen?: (index: number) => void;
  className?: string;
  maxCells?: number;
}) {
  const imgs = urls.filter(Boolean);
  const n = imgs.length;
  if (n === 0) return null;

  const open = (i: number) => onOpen?.(i);

  if (n === 1) {
    return (
      <div className={className}>
        <MediaCell
          url={imgs[0]!}
          onOpen={onOpen ? () => open(0) : undefined}
          className="aspect-[4/3] w-full sm:aspect-[16/9]"
        />
      </div>
    );
  }

  if (n === 2) {
    return (
      <ul className={`grid grid-cols-2 gap-1 ${className}`}>
        {imgs.slice(0, 2).map((url, i) => (
          <li key={`${url}-${i}`} className="aspect-square min-h-[120px]">
            <MediaCell
              url={url}
              onOpen={onOpen ? () => open(i) : undefined}
              className="h-full rounded-lg"
            />
          </li>
        ))}
      </ul>
    );
  }

  if (n === 3) {
    return (
      <ul className={`grid grid-cols-2 gap-1 ${className}`}>
        <li className="row-span-2 aspect-[3/4] min-h-[160px]">
          <MediaCell
            url={imgs[0]!}
            onOpen={onOpen ? () => open(0) : undefined}
            className="h-full rounded-lg"
          />
        </li>
        <li className="aspect-square min-h-[76px]">
          <MediaCell
            url={imgs[1]!}
            onOpen={onOpen ? () => open(1) : undefined}
            className="h-full rounded-lg"
          />
        </li>
        <li className="aspect-square min-h-[76px]">
          <MediaCell
            url={imgs[2]!}
            onOpen={onOpen ? () => open(2) : undefined}
            className="h-full rounded-lg"
          />
        </li>
      </ul>
    );
  }

  const shown = imgs.slice(0, maxCells);
  const extra = imgs.length - maxCells;

  return (
    <ul className={`grid grid-cols-2 gap-1 ${className}`}>
      {shown.map((url, i) => (
        <li key={`${url}-${i}`} className="relative aspect-square min-h-[100px]">
          <MediaCell
            url={url}
            onOpen={onOpen ? () => open(i) : undefined}
            className="h-full rounded-lg"
          />
          {i === maxCells - 1 && extra > 0 ? (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 text-sm font-bold text-white">
              +{extra}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
