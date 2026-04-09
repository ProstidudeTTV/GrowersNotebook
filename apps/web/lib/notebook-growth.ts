import type { NotebookDetailPayload } from "@/components/notebook-detail-client";

export const GROWTH_STAGE_LABEL: Record<string, string> = {
  germination: "Germination",
  vegetation: "Vegetation",
  flower: "Flower",
  harvest: "Harvest",
};

export function maxNotebookWeekIndex(
  weeks: NotebookDetailPayload["weeks"],
): number {
  return weeks.length ? Math.max(...weeks.map((w) => w.weekIndex)) : 0;
}

/** Weeks logged after leaving germination (week index strictly greater than boundary). */
export function vegetationWeekCount(nb: NotebookDetailPayload): number {
  const b = nb.vegPhaseStartedAfterWeekIndex ?? 0;
  return nb.weeks.filter((w) => w.weekIndex > b).length;
}

export function showStartVegetation(nb: NotebookDetailPayload): boolean {
  const stage = nb.growthStage ?? "germination";
  return stage === "germination" && nb.weeks.length >= 1;
}

export function showStartFlowering(nb: NotebookDetailPayload): boolean {
  const stage = nb.growthStage ?? "germination";
  return stage === "vegetation" && vegetationWeekCount(nb) >= 2;
}

export function showHarvestPanel(nb: NotebookDetailPayload): boolean {
  const stage = nb.growthStage ?? "germination";
  return stage === "flower" || stage === "harvest";
}

/** Which grow phase a weekly log belongs to (for styling). */
export type WeekLogPhase =
  | "germination"
  | "vegetation"
  | "flower"
  | "harvest";

/**
 * Map a week index to its phase using the same boundaries as transitions:
 * weeks ≤ vegPhaseStartedAfterWeekIndex are germination; then vegetation until
 * flowerPhaseStartedAfterWeekIndex; then flower; after transition to harvest,
 * weeks past the flower boundary use harvest styling.
 */
export function weekLogPhase(
  nb: NotebookDetailPayload,
  weekIndex: number,
): WeekLogPhase {
  const vegB = nb.vegPhaseStartedAfterWeekIndex;
  const floB = nb.flowerPhaseStartedAfterWeekIndex;
  const stage = nb.growthStage ?? "germination";

  if (vegB == null) {
    if (floB != null && weekIndex > floB) {
      return stage === "harvest" ? "harvest" : "flower";
    }
    return "germination";
  }

  if (weekIndex <= vegB) return "germination";

  if (floB != null && weekIndex > floB) {
    return stage === "harvest" ? "harvest" : "flower";
  }

  return "vegetation";
}

/** Compact Tailwind classes for week cards (left accent + tint). */
export function weekPhaseCardClass(phase: WeekLogPhase): string {
  switch (phase) {
    case "germination":
      return "border-[var(--gn-border)] border-l-[3px] border-l-sky-400/90 bg-sky-500/[0.06]";
    case "vegetation":
      return "border-[var(--gn-border)] border-l-[3px] border-l-emerald-400/90 bg-emerald-500/[0.07]";
    case "flower":
      return "border-[var(--gn-border)] border-l-[3px] border-l-amber-400/90 bg-amber-500/[0.07]";
    case "harvest":
      return "border-[var(--gn-border)] border-l-[3px] border-l-red-400/90 bg-red-500/[0.07]";
    default:
      return "border-[var(--gn-border)] bg-[var(--gn-surface-muted)]";
  }
}

/** Sidebar / chip: inactive pill border + background by phase. */
export function weekPhaseNavIdleClass(phase: WeekLogPhase): string {
  switch (phase) {
    case "germination":
      return "border-sky-500/35 bg-sky-500/10 text-sky-200/90";
    case "vegetation":
      return "border-emerald-500/35 bg-emerald-500/10 text-emerald-100/90";
    case "flower":
      return "border-amber-500/40 bg-amber-500/10 text-amber-100/90";
    case "harvest":
      return "border-red-500/40 bg-red-500/10 text-red-100/90";
    default:
      return "border-[var(--gn-divide)] text-[var(--gn-text-muted)]";
  }
}

/** Sidebar / chip: active (scroll-spy) emphasis. */
export function weekPhaseNavActiveClass(phase: WeekLogPhase): string {
  switch (phase) {
    case "germination":
      return "border-sky-400 bg-sky-500/25 font-medium text-sky-50 ring-1 ring-sky-400/50";
    case "vegetation":
      return "border-emerald-400 bg-emerald-500/25 font-medium text-emerald-50 ring-1 ring-emerald-400/50";
    case "flower":
      return "border-amber-400 bg-amber-500/25 font-medium text-amber-50 ring-1 ring-amber-400/50";
    case "harvest":
      return "border-red-400 bg-red-500/25 font-medium text-red-50 ring-1 ring-red-400/50";
    default:
      return "border-emerald-500/50 bg-emerald-500/15 font-medium text-[var(--gn-text)]";
  }
}
