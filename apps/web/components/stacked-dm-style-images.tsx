"use client";

import { isDmVideoUrl } from "@/lib/dm-media-url";

/**
 * Compact vertical photo pile (DM / comment style): square tiles, light stagger.
 * Uses object-cover so mixed aspect ratios fill the frame without letterboxing.
 */
const DM_STACK_OVERLAP_Y = 6;
const DM_STACK_JITTER_X = 2;
const DM_STACK_ROTATION_PAD = 20;

const CARD_LG = 168;
const CARD_MD = 108;
const CARD_SM = 76;

export type DmStackImageSize = "compact" | "default" | "large";

function cardSizePx(size: DmStackImageSize): number {
  if (size === "compact") return CARD_SM;
  if (size === "large") return CARD_LG;
  return CARD_MD;
}

function dmStackCardLeft(
  stackInnerWidth: number,
  idx: number,
  cardPx: number,
): number {
  const center =
    (stackInnerWidth - cardPx) / 2 +
    (idx % 2 === 0 ? -DM_STACK_JITTER_X : DM_STACK_JITTER_X);
  return Math.max(0, Math.round(center * 10) / 10);
}

function dmStackCardRotation(index: number, total: number): number {
  if (total <= 1 || index === total - 1) return 0;
  const depth = total - 1 - index;
  const sign = index % 2 === 0 ? -1 : 1;
  return sign * Math.min(3.5, 1.2 + depth * 0.55);
}

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
    <img src={url} alt="" className={className} />
  );
}

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
  const card = cardSizePx(resolvedSize);
  const n = imgs.length;
  const stackW =
    n <= 1
      ? undefined
      : card + DM_STACK_JITTER_X * 2 + DM_STACK_ROTATION_PAD + 6;
  const stackH =
    n <= 1
      ? undefined
      : (n - 1) * DM_STACK_OVERLAP_Y + card + DM_STACK_ROTATION_PAD + 8;
  const stackInnerW = stackW ?? 0;

  return (
    <div className={[`overflow-visible`, className].filter(Boolean).join(" ")}>
      {pileLabel && n > 1 ? (
        <p className="mb-1.5 text-sm font-medium text-[var(--gn-text-muted)]">
          {pileLabel}
        </p>
      ) : null}
      {n === 1 ? (
        <button
          type="button"
          className="max-w-full border-0 bg-transparent p-0"
          onClick={() => onOpen(0)}
        >
          <MediaThumb
            url={imgs[0]}
            className={
              resolvedSize === "large"
                ? "h-44 w-44 max-w-full cursor-zoom-in rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] object-cover shadow-md sm:h-52 sm:w-52 lg:h-56 lg:w-56"
                : resolvedSize === "compact"
                  ? "h-20 w-20 cursor-zoom-in rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] object-cover shadow-md"
                  : "h-28 w-28 cursor-zoom-in rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] object-cover shadow-md sm:h-32 sm:w-32"
            }
          />
        </button>
      ) : (
        <button
          type="button"
          className="relative overflow-visible border-0 bg-transparent p-0 text-left"
          style={{
            width: stackW,
            height: stackH,
            minWidth: stackW,
            minHeight: stackH,
          }}
          onClick={() => onOpen(imgs.length - 1)}
          aria-label={`${imgs.length} attachments — open viewer`}
        >
          {imgs.map((url, idx) => {
            const rot = dmStackCardRotation(idx, imgs.length);
            return (
              <span
                key={`${stackKey}-${idx}-${url}`}
                className="absolute box-border overflow-hidden rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] shadow-[0_4px_14px_rgba(0,0,0,0.12)] ring-1 ring-black/5 dark:shadow-[0_4px_18px_rgba(0,0,0,0.35)] dark:ring-white/10"
                style={{
                  left: dmStackCardLeft(stackInnerW, idx, card),
                  top: DM_STACK_ROTATION_PAD / 2 + idx * DM_STACK_OVERLAP_Y,
                  width: card,
                  height: card,
                  minWidth: card,
                  minHeight: card,
                  maxWidth: card,
                  maxHeight: card,
                  zIndex: idx,
                  transform: `rotate(${rot}deg)`,
                  transformOrigin: "50% 50%",
                }}
              >
                <MediaThumb
                  url={url}
                  className="h-full w-full min-h-0 min-w-0 cursor-zoom-in object-cover object-center"
                />
              </span>
            );
          })}
        </button>
      )}
    </div>
  );
}
