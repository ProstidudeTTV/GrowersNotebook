"use client";

import { isDmVideoUrl } from "@/lib/dm-media-url";

function MediaCell({
  url,
  onOpen,
  className = "",
}: {
  url: string;
  onOpen: () => void;
  className?: string;
}) {
  const video = isDmVideoUrl(url);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`relative block w-full overflow-hidden rounded-xl bg-[var(--gn-surface-muted)] ring-1 ring-[var(--gn-divide)] ${className}`}
    >
      {video ? (
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
      )}
    </button>
  );
}

/** Facebook/Instagram-style inline grid for 2–4 attachments (no letterbox stack). */
export function CommentDmMediaGrid({
  urls,
  onOpen,
  className = "",
}: {
  urls: string[];
  onOpen: (index: number) => void;
  className?: string;
}) {
  const imgs = urls.filter(Boolean);
  const n = imgs.length;
  if (n === 0) return null;

  if (n === 1) {
    return (
      <div className={className}>
        <MediaCell
          url={imgs[0]!}
          onOpen={() => onOpen(0)}
          className="max-w-[min(100%,18rem)] aspect-[4/3] sm:aspect-video"
        />
      </div>
    );
  }

  if (n === 2) {
    return (
      <ul
        className={`grid max-w-[min(100%,20rem)] grid-cols-2 gap-1.5 ${className}`}
      >
        {imgs.map((url, i) => (
          <li key={`${url}-${i}`} className="aspect-square min-h-[120px]">
            <MediaCell url={url} onOpen={() => onOpen(i)} className="h-full" />
          </li>
        ))}
      </ul>
    );
  }

  if (n === 3) {
    return (
      <ul
        className={`grid max-w-[min(100%,20rem)] grid-cols-2 gap-1.5 ${className}`}
      >
        <li className="row-span-2 aspect-[3/4] min-h-[160px]">
          <MediaCell url={imgs[0]!} onOpen={() => onOpen(0)} className="h-full" />
        </li>
        <li className="aspect-square min-h-[76px]">
          <MediaCell url={imgs[1]!} onOpen={() => onOpen(1)} className="h-full" />
        </li>
        <li className="aspect-square min-h-[76px]">
          <MediaCell url={imgs[2]!} onOpen={() => onOpen(2)} className="h-full" />
        </li>
      </ul>
    );
  }

  return (
    <ul
      className={`grid max-w-[min(100%,20rem)] grid-cols-2 gap-1.5 ${className}`}
    >
      {imgs.slice(0, 4).map((url, i) => (
        <li key={`${url}-${i}`} className="relative aspect-square min-h-[100px]">
          <MediaCell url={url} onOpen={() => onOpen(i)} className="h-full" />
          {i === 3 && imgs.length > 4 ? (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 text-sm font-bold text-white">
              +{imgs.length - 4}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
