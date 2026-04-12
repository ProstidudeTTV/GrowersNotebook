"use client";

import { isDmVideoUrl } from "@/lib/dm-media-url";

/**
 * Vertical photo pile: same-size square tiles, mostly stacked along Y with a
 * tiny ±X stagger and light rotation (matches DMs in `messages-panel`).
 */
const DM_STACK_OVERLAP_Y = 7;
const DM_STACK_JITTER_X = 2;
const DM_STACK_ROTATION_PAD = 28;

const CARD_MD = 128;
const CARD_SM = 72;

function cardSizePx(compact: boolean): number {
  return compact ? CARD_SM : CARD_MD;
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
  return sign * Math.min(4, 1.5 + depth * 0.65);
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
  className = "",
}: {
  urls: string[];
  stackKey: string;
  pileLabel?: string | null;
  onOpen: (index: number) => void;
  compact?: boolean;
  className?: string;
}) {
  const imgs = urls.filter(Boolean);
  if (imgs.length === 0) return null;

  const card = cardSizePx(compact);
  const n = imgs.length;
  const stackW =
    n <= 1
      ? undefined
      : card + DM_STACK_JITTER_X * 2 + DM_STACK_ROTATION_PAD + 8;
  const stackH =
    n <= 1
      ? undefined
      : (n - 1) * DM_STACK_OVERLAP_Y + card + DM_STACK_ROTATION_PAD + 12;
  const stackInnerW = stackW ?? 0;

  return (
    <div className={[`overflow-visible ${n > 1 ? "" : ""}`, className].join(" ")}>
      {pileLabel && n > 1 ? (
        <p className="mb-1.5 text-[0.7rem] font-medium text-[var(--gn-text-muted)]">
          {pileLabel}
        </p>
      ) : null}
      {n === 1 ? (
        <button
          type="button"
          className={
            compact
              ? "max-w-[min(4.5rem,85%)] border-0 bg-transparent p-0"
              : "max-w-[min(11rem,85%)] border-0 bg-transparent p-0"
          }
          onClick={() => onOpen(0)}
        >
          <MediaThumb
            url={imgs[0]}
            className={
              compact
                ? "max-h-20 w-auto max-w-full cursor-zoom-in rounded-[1rem] border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] object-contain shadow-md"
                : "max-h-[min(11rem,28vh)] w-auto max-w-full cursor-zoom-in rounded-[1.35rem] border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] object-contain shadow-md"
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
                className="absolute box-border overflow-hidden rounded-[1.35rem] border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] shadow-[0_6px_18px_rgba(0,0,0,0.14)] ring-1 ring-black/5 dark:shadow-[0_6px_22px_rgba(0,0,0,0.45)] dark:ring-white/10"
                style={{
                  left: dmStackCardLeft(stackInnerW, idx, card),
                  top:
                    DM_STACK_ROTATION_PAD / 2 + idx * DM_STACK_OVERLAP_Y,
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
                  className="h-full w-full min-h-0 min-w-0 cursor-zoom-in object-contain object-center"
                />
              </span>
            );
          })}
        </button>
      )}
    </div>
  );
}
