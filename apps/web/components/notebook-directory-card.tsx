"use client";

import Link from "next/link";
import { GROWTH_STAGE_LABEL } from "@/lib/notebook-growth-labels";

export type NotebookDirectoryItem = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  growthStage?: string | null;
  customStrainLabel: string | null;
  coverImageUrl?: string | null;
  weekCount?: number;
  owner: {
    id: string;
    displayName: string | null;
    avatarUrl?: string | null;
  };
  strain: { slug: string; name: string | null } | null;
  breeder: { slug: string; name: string } | null;
  score: number;
};

function formatListDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function statusPillClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-[color-mix(in_srgb,var(--gn-accent)_15%,transparent)] text-[var(--gn-accent)] ring-[color-mix(in_srgb,var(--gn-accent)_25%,transparent)]";
    case "completed":
      return "bg-sky-500/15 text-sky-200 ring-sky-500/25";
    default:
      return "bg-[var(--gn-surface-elevated)] text-[var(--gn-text-muted)] ring-[var(--gn-divide)]";
  }
}

function phaseLabel(stage: string | null | undefined): string | null {
  if (!stage) return null;
  const key = stage as keyof typeof GROWTH_STAGE_LABEL;
  return GROWTH_STAGE_LABEL[key] ?? stage;
}

/**
 * GrowDiaries-style directory tile: cover photo, week count, strain, grower.
 */
export function NotebookDirectoryCard({ n }: { n: NotebookDirectoryItem }) {
  const growerName = n.owner.displayName?.trim() || "Grower";
  const strainLabel =
    n.strain?.name?.trim() || n.customStrainLabel?.trim() || null;
  const href = `/notebooks/${encodeURIComponent(n.id)}`;
  const weeks = typeof n.weekCount === "number" ? n.weekCount : 0;
  const phase = phaseLabel(n.growthStage);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] shadow-[var(--gn-shadow-sm)] transition hover:border-[color-mix(in_srgb,var(--gn-accent)_35%,var(--gn-divide))] hover:shadow-[var(--gn-shadow-md)]">
      <Link
        href={href}
        className="absolute inset-0 z-10 rounded-2xl outline-none ring-[var(--gn-accent)] ring-offset-2 ring-offset-[var(--gn-page-mid)] focus-visible:ring-2"
        aria-label={`Open notebook: ${n.title}`}
      />
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--gn-surface-muted)]">
        {n.coverImageUrl?.trim() ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={n.coverImageUrl.trim()}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[color-mix(in_srgb,var(--gn-accent)_22%,var(--gn-surface-muted))] to-[var(--gn-surface-elevated)] text-[var(--gn-text-muted)]">
            <span className="text-4xl opacity-40" aria-hidden>
              🌱
            </span>
            <span className="text-xs font-medium">No photos yet</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1.5">
          {weeks > 0 ? (
            <span className="rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
              {weeks} {weeks === 1 ? "week" : "weeks"}
            </span>
          ) : null}
          {phase ? (
            <span className="rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white/95 backdrop-blur-sm">
              {phase}
            </span>
          ) : null}
        </div>
        <span
          className={`pointer-events-none absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1 backdrop-blur-sm ${statusPillClass(n.status)}`}
        >
          {n.status}
        </span>
      </div>
      <div className="pointer-events-none relative z-20 flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-[var(--gn-text)] transition-colors group-hover:text-[var(--gn-accent)]">
          {n.title}
        </h3>
        {strainLabel ? (
          <p className="line-clamp-1 text-xs font-medium text-[var(--gn-accent)]">
            {strainLabel}
          </p>
        ) : null}
        <p className="mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[var(--gn-text-muted)]">
          <span className="font-medium text-[var(--gn-text)]">{growerName}</span>
          {n.breeder ? (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{n.breeder.name}</span>
            </>
          ) : null}
        </p>
        <p className="text-[11px] text-[var(--gn-text-muted)]">
          <span className="font-semibold text-[var(--gn-text)]">{n.score}</span>{" "}
          seeds · Updated {formatListDate(n.updatedAt)}
        </p>
      </div>
      {n.strain?.slug ? (
        <Link
          href={`/strains/${encodeURIComponent(n.strain.slug)}`}
          className="pointer-events-auto absolute bottom-3 right-3 z-30 hidden rounded-full bg-[var(--gn-surface-elevated)]/90 px-2 py-0.5 text-[10px] font-medium text-[var(--gn-accent)] ring-1 ring-[var(--gn-divide)] hover:underline sm:inline"
          onClick={(e) => e.stopPropagation()}
        >
          Strain
        </Link>
      ) : null}
    </article>
  );
}
