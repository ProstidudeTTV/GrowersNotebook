"use client";

import { useEffect, useRef } from "react";
import { formatVoteScore } from "@/lib/grower-display";
import { normalizedViewerVote } from "@/lib/vote-ui";

type Size = "sm" | "lg";

const sizes: Record<
  Size,
  { shell: string; btn: string; arrow: string; counts: string }
> = {
  sm: {
    shell: "w-[2.75rem] gap-px py-0.5",
    btn: "h-7 w-full rounded-md",
    arrow: "text-[11px] font-semibold leading-none",
    counts:
      "min-h-[2rem] px-0.5 text-[10px] font-medium tabular-nums leading-tight text-[var(--gn-text-muted)]",
  },
  lg: {
    shell: "w-11 gap-0.5 p-1",
    btn: "h-9 w-full rounded-lg",
    arrow: "text-sm font-bold leading-none",
    counts:
      "min-h-[2.25rem] px-0.5 text-[11px] font-semibold tabular-nums leading-snug text-[var(--gn-text-muted)]",
  },
};

/**
 * ▲ / +up · −down / ▼ — no large net score; arrows stay colored when viewerVote matches.
 */
export function VoteScoreRail({
  score: scoreIn,
  upvotes: upIn,
  downvotes: downIn,
  viewerVote,
  onUp,
  onDown,
  disabled,
  size = "lg",
  titles = {},
}: {
  score?: number | null | undefined;
  upvotes: number | null | undefined;
  downvotes: number | null | undefined;
  viewerVote: number | null | undefined;
  onUp: () => void;
  onDown: () => void;
  disabled?: boolean;
  size?: Size;
  titles?: { up?: string; down?: string };
}) {
  const upvotes = Number.isFinite(Number(upIn)) ? Number(upIn) : 0;
  const downvotes = Number.isFinite(Number(downIn)) ? Number(downIn) : 0;
  const vv = normalizedViewerVote(viewerVote);
  const countsRef = useRef<HTMLDivElement>(null);
  const prevSig = useRef(`${upvotes}-${downvotes}`);

  useEffect(() => {
    const sig = `${upvotes}-${downvotes}`;
    if (prevSig.current === sig) return;
    prevSig.current = sig;
    const el = countsRef.current;
    if (!el) return;
    el.classList.remove("vote-score-pulse");
    void el.offsetWidth;
    el.classList.add("vote-score-pulse");
  }, [upvotes, downvotes]);

  const s = sizes[size];
  const upActive =
    "bg-orange-500/15 text-[#ff4500] shadow-[inset_0_0_0_1px_rgba(249,115,22,0.35)] dark:bg-orange-500/20 dark:text-[#ff8b60]";
  const upIdle =
    "text-[var(--gn-text-muted)] hover:bg-orange-500/12 hover:text-[#ff4500] dark:hover:text-[#ff8b60]";
  const downActive =
    "bg-violet-500/15 text-violet-600 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.35)] dark:bg-violet-500/20 dark:text-violet-300";
  const downIdle =
    "text-[var(--gn-text-muted)] hover:bg-violet-500/12 hover:text-violet-600 dark:hover:text-violet-400";

  const upCls = `${s.btn} flex items-center justify-center border-0 transition ${vv === 1 ? upActive : upIdle}`;
  const downCls = `${s.btn} flex items-center justify-center border-0 transition ${vv === -1 ? downActive : downIdle}`;

  const net = Number.isFinite(Number(scoreIn)) ? Number(scoreIn) : upvotes - downvotes;

  const wrap =
    size === "lg"
      ? `rounded-2xl gn-vote-rail ${s.shell} flex flex-col items-stretch`
      : `${s.shell} flex flex-col items-stretch`;

  return (
    <div
      className={wrap}
      aria-label={`Net ${net}, ${upvotes} upvotes, ${downvotes} downvotes`}
    >
      <button
        type="button"
        disabled={disabled}
        title={titles.up ?? "Upvote (click again to remove)"}
        onClick={onUp}
        className={`${upCls} ${s.arrow} disabled:opacity-40`}
      >
        ▲
      </button>
      <div
        ref={countsRef}
        className={`flex flex-col items-center justify-center text-center ${s.counts}`}
      >
        <span className="text-emerald-600/90 dark:text-emerald-400/90">
          +{upvotes}
        </span>
        <span className="opacity-50">·</span>
        <span className="text-violet-600/90 dark:text-violet-400/90">
          −{downvotes}
        </span>
      </div>
      <button
        type="button"
        disabled={disabled}
        title={titles.down ?? "Downvote (click again to remove)"}
        onClick={onDown}
        className={`${downCls} ${s.arrow} disabled:opacity-40`}
      >
        ▼
      </button>
    </div>
  );
}

/** Feed column: non-interactive. */
export function VoteScoreReadonly({
  score: scoreIn,
  upvotes: upIn,
  downvotes: downIn,
  variant = "inline",
}: {
  score: number | null | undefined;
  upvotes: number | null | undefined;
  downvotes: number | null | undefined;
  /** `feed`: padded strip for list rows. */
  variant?: "inline" | "feed";
}) {
  const score = Number.isFinite(Number(scoreIn)) ? Number(scoreIn) : 0;
  const upvotes = Number.isFinite(Number(upIn)) ? Number(upIn) : 0;
  const downvotes = Number.isFinite(Number(downIn)) ? Number(downIn) : 0;
  const scoreRef = useRef<HTMLDivElement>(null);
  const prevScore = useRef(score);

  useEffect(() => {
    if (prevScore.current === score) return;
    prevScore.current = score;
    const el = scoreRef.current;
    if (!el) return;
    el.classList.remove("vote-score-pulse");
    void el.offsetWidth;
    el.classList.add("vote-score-pulse");
  }, [score]);

  const scoreColor =
    score > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : score < 0
        ? "text-violet-600 dark:text-violet-400"
        : "text-[var(--gn-text-muted)]";

  if (variant === "feed") {
    return (
      <div
        className="flex min-w-[3.5rem] shrink-0 flex-col items-center justify-center self-stretch border-r border-[var(--gn-divide)] bg-[color-mix(in_srgb,var(--gn-surface-muted)_55%,transparent)] px-2 py-3 sm:min-w-[4rem] sm:px-3"
        aria-label={`Net score ${formatVoteScore(score)}, ${upvotes} upvotes, ${downvotes} downvotes`}
      >
        <div
          ref={scoreRef}
          className={`text-center text-sm font-semibold tabular-nums leading-none ${scoreColor}`}
        >
          {formatVoteScore(score)}
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[10px] tabular-nums leading-none text-[var(--gn-text-muted)]">
          <span className="text-emerald-600/85 dark:text-emerald-400/90">
            +{upvotes}
          </span>
          <span className="opacity-40">/</span>
          <span className="text-violet-600/85 dark:text-violet-400/90">
            −{downvotes}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-10 shrink-0 flex-col items-center justify-center border-r border-[var(--gn-divide)] py-2 pr-2.5">
      <div
        ref={scoreRef}
        className={`text-center text-[15px] font-semibold tabular-nums leading-none ${scoreColor}`}
      >
        {formatVoteScore(score)}
      </div>
      <div className="mt-1 text-center text-[10px] tabular-nums leading-tight text-[var(--gn-text-muted)]">
        +{upvotes}
        <span className="opacity-50"> · </span>−{downvotes}
      </div>
    </div>
  );
}
