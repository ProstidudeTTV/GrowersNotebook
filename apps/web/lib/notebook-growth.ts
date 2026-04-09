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
  return stage === "germination" && nb.weeks.length >= 2;
}

export function showStartFlowering(nb: NotebookDetailPayload): boolean {
  const stage = nb.growthStage ?? "germination";
  return stage === "vegetation" && vegetationWeekCount(nb) >= 2;
}

export function showHarvestPanel(nb: NotebookDetailPayload): boolean {
  const stage = nb.growthStage ?? "germination";
  return stage === "flower" || stage === "harvest";
}
