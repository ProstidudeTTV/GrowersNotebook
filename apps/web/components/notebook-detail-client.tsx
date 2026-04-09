"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VoteFeedPill } from "@/components/vote-score-rail";
import { apiFetch } from "@/lib/api-public";
import {
  normalizedViewerVote,
  parseVoteMutationResponse,
  talliesAfterVoteClick,
} from "@/lib/vote-ui";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import {
  GROWTH_STAGE_LABEL,
  maxNotebookWeekIndex,
  showHarvestPanel,
  showStartFlowering,
  showStartVegetation,
} from "@/lib/notebook-growth";
import {
  litersToDisplayVolume,
  normalizeTempUnit,
  normalizeVolumeUnit,
  tempCToDisplay,
  tempSuffix,
  volumeSuffix,
} from "@/lib/notebook-units";
import { NotebookHarvestWizard } from "@/components/notebooks/notebook-harvest-wizard";
import { NotebookSettingsModal } from "@/components/notebooks/notebook-settings-modal";
import { NotebookSetupWizard } from "@/components/notebooks/notebook-setup-wizard";
import { NotebookWeekSidebar } from "@/components/notebooks/notebook-week-sidebar";
import { NotebookWeekWizard } from "@/components/notebooks/notebook-week-wizard";
import { PostMediaCarousel } from "@/components/post-media-carousel";
import type { PostMediaItem } from "@/lib/feed-post";

type WeekNut = {
  customLabel: string | null;
  dosage: string | null;
  productName: string | null;
};

type Week = {
  id: string;
  weekIndex: number;
  notes: string | null;
  tempC: string | null;
  humidityPct: string | null;
  ph: string | null;
  ec: string | null;
  ppm?: string | null;
  waterNotes?: string | null;
  waterVolumeLiters?: string | null;
  lightCycle: string | null;
  imageUrls: string[];
  nutrients: WeekNut[];
};

export type NotebookDetailPayload = {
  id: string;
  ownerId: string;
  title: string;
  strainId: string | null;
  customStrainLabel: string | null;
  status: string;
  strain: { slug: string; name: string | null } | null;
  plantCount: number | null;
  totalLightWatts: string | null;
  harvestDryWeightG: string | null;
  harvestQualityNotes: string | null;
  gPerWatt: string | null;
  gPerWattPerPlant: string | null;
  roomType?: string | null;
  wateringType?: string | null;
  startType?: string | null;
  setupNotes?: string | null;
  /** ISO timestamp from API; used for first-run setup wizard cutoff. */
  createdAt?: string | null;
  setupWizardCompletedAt?: string | null;
  preferredTempUnit?: string | null;
  preferredVolumeUnit?: string | null;
  /** Photoperiod for vegetation (e.g. 18/6); notebook-level. */
  vegLightCycle?: string | null;
  /** Photoperiod for flower (e.g. 12/12); notebook-level. */
  flowerLightCycle?: string | null;
  growthStage?: string;
  vegPhaseStartedAfterWeekIndex?: number | null;
  flowerPhaseStartedAfterWeekIndex?: number | null;
  harvestImageUrls?: string[];
  score: number;
  upvotes: number;
  downvotes: number;
  viewerVote: number | null;
  owner: { id: string; displayName: string | null; avatarUrl: string | null };
  weeks: Week[];
};

type NbComment = {
  id: string;
  body: string;
  createdAt: string;
  imageUrls: string[];
  parentId: string | null;
  author: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
    seeds: number;
    growerLevel: string;
  };
};

type WeekRow = NotebookDetailPayload["weeks"][number];

function StatTile({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)]/70 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-[var(--gn-text)]">{children}</div>
    </div>
  );
}

function weekImagesAsPostMedia(urls: string[] | undefined): PostMediaItem[] {
  if (!urls?.length) return [];
  return urls
    .filter(Boolean)
    .map((url) => ({ url, type: "image" as const }));
}

export function NotebookDetailClient({
  initial,
  openSetupGuide = false,
}: {
  initial: NotebookDetailPayload;
  /** When true (e.g. `/notebooks/:id?setup=1` or via `/edit`), owner sees the setup wizard once. */
  openSetupGuide?: boolean;
}) {
  const router = useRouter();
  const [nb, setNb] = useState(initial);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [voteBusy, setVoteBusy] = useState(false);
  const [comments, setComments] = useState<NbComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  const [setupWizardOpen, setSetupWizardOpen] = useState(false);
  /** Avoid re-opening the setup modal on every render while `?setup=1` is still in the URL. */
  const setupFromUrlOpenedRef = useRef(false);
  const [weekWizardOpen, setWeekWizardOpen] = useState(false);
  const [weekWizardMode, setWeekWizardMode] = useState<"create" | "edit">(
    "create",
  );
  const [weekEditTarget, setWeekEditTarget] = useState<WeekRow | null>(null);
  const [harvestWizardOpen, setHarvestWizardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const reloadNotebook = useCallback(async () => {
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      const data = await apiFetch<NotebookDetailPayload>(`/notebooks/${nb.id}`, {
        token: token ?? undefined,
      });
      setNb(data);
      return data;
    } catch {
      /* ignore */
    }
    return undefined;
  }, [nb.id]);

  const clearSetupQuery = useCallback(() => {
    if (!openSetupGuide) return;
    router.replace(`/notebooks/${nb.id}`);
  }, [openSetupGuide, router, nb.id]);

  useEffect(() => {
    setNb(initial);
  }, [initial]);

  useEffect(() => {
    setupFromUrlOpenedRef.current = false;
    setSetupWizardOpen(false);
  }, [initial.id]);

  useEffect(() => {
    if (!openSetupGuide) {
      setupFromUrlOpenedRef.current = false;
      return;
    }
    if (setupFromUrlOpenedRef.current) return;
    if (!viewerId || viewerId !== nb.ownerId) return;
    setupFromUrlOpenedRef.current = true;
    setSetupWizardOpen(true);
  }, [openSetupGuide, viewerId, nb.ownerId]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setViewerId(session?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setViewerId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const reloadComments = useCallback(async () => {
    const list = await apiFetch<NbComment[]>(`/notebooks/${initial.id}/comments`);
    setComments(list);
  }, [initial.id]);

  useEffect(() => {
    void reloadComments();
  }, [reloadComments]);

  const vote = async (value: 1 | -1) => {
    if (!viewerId) {
      router.push("/login");
      return;
    }
    setVoteBusy(true);
    const prevVv = normalizedViewerVote(nb.viewerVote);
    const optimistic = talliesAfterVoteClick(
      nb.upvotes,
      nb.downvotes,
      prevVv,
      value,
    );
    setNb((p) => ({ ...p, ...optimistic }));
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) throw new Error("Sign in to vote.");
      const voteRes = await apiFetch<Record<string, unknown>>("/votes/notebook", {
        method: "POST",
        token,
        body: JSON.stringify({ notebookId: nb.id, value }),
      });
      const metrics = parseVoteMutationResponse(voteRes);
      if (metrics) {
        setNb((p) => ({
          ...p,
          score: metrics.score,
          upvotes: metrics.upvotes,
          downvotes: metrics.downvotes,
          viewerVote: metrics.viewerVote,
        }));
      }
    } catch {
      setNb(initial);
    } finally {
      setVoteBusy(false);
    }
  };

  const submitComment = async () => {
    const text = commentBody.trim();
    if (!text) return;
    if (!viewerId) {
      router.push("/login");
      return;
    }
    setCommentBusy(true);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) throw new Error("Sign in.");
      await apiFetch(`/notebooks/${nb.id}/comments`, {
        method: "POST",
        token,
        body: JSON.stringify({ body: text }),
      });
      setCommentBody("");
      await reloadComments();
    } catch {
      /* ignore */
    } finally {
      setCommentBusy(false);
    }
  };

  const isOwner = viewerId === nb.ownerId;
  const preferredTempUnit = normalizeTempUnit(nb.preferredTempUnit);
  const preferredVolumeUnit = normalizeVolumeUnit(nb.preferredVolumeUnit);
  const strainLabel =
    nb.strain?.name?.trim() || nb.customStrainLabel?.trim() || null;

  const nextWeekIndex = useMemo(() => {
    if (!nb.weeks?.length) return 1;
    return Math.max(...nb.weeks.map((w) => w.weekIndex)) + 1;
  }, [nb.weeks]);

  const showGrowingSetup = !!(
    nb.roomType ||
    nb.wateringType ||
    nb.startType ||
    nb.setupNotes?.trim() ||
    nb.plantCount != null ||
    nb.totalLightWatts ||
    nb.vegLightCycle?.trim() ||
    nb.flowerLightCycle?.trim()
  );

  const transitionToVegetation = async () => {
    const supabase = createClient();
    const token = await getAccessTokenForApi(supabase);
    if (!token) return;
    const m = maxNotebookWeekIndex(nb.weeks);
    await apiFetch(`/notebooks/${nb.id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({
        growthStage: "vegetation",
        vegPhaseStartedAfterWeekIndex: m,
      }),
    });
    await reloadNotebook();
  };

  const transitionToFlowering = async () => {
    const supabase = createClient();
    const token = await getAccessTokenForApi(supabase);
    if (!token) return;
    const m = maxNotebookWeekIndex(nb.weeks);
    await apiFetch(`/notebooks/${nb.id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({
        growthStage: "flower",
        flowerPhaseStartedAfterWeekIndex: m,
      }),
    });
    await reloadNotebook();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <aside className="order-2 hidden w-52 shrink-0 lg:order-1 lg:block">
          <div className="sticky top-20 rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-4">
            <NotebookWeekSidebar weeks={nb.weeks} variant="sidebar" />
          </div>
        </aside>

        <div className="order-1 min-w-0 flex-1 lg:order-2">
          <div className="flex gap-4">
            <VoteFeedPill
              score={nb.score}
              upvotes={nb.upvotes}
              downvotes={nb.downvotes}
              viewerVote={nb.viewerVote}
              onUp={() => void vote(1)}
              onDown={() => void vote(-1)}
              disabled={voteBusy}
            />
            <div className="min-w-0 flex-1">
              <div className="rounded-2xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-[var(--gn-text)]">
                      {nb.title}
                    </h1>
                    <p className="mt-2 text-sm text-[var(--gn-text-muted)]">
                      <Link
                        href={`/u/${encodeURIComponent(nb.ownerId)}`}
                        className="text-[#ff4500] hover:underline"
                      >
                        {nb.owner.displayName?.trim() || "Grower"}
                      </Link>
                      {nb.strain?.slug ? (
                        <>
                          {" "}
                          ·{" "}
                          <Link
                            href={`/strains/${encodeURIComponent(nb.strain.slug)}`}
                            className="text-[#ff4500] hover:underline"
                          >
                            Strain catalog
                          </Link>
                        </>
                      ) : null}
                    </p>
                    {(strainLabel || nb.growthStage) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {strainLabel ? (
                          <span className="rounded-full border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2.5 py-0.5 text-xs font-medium text-[var(--gn-text)]">
                            {strainLabel}
                          </span>
                        ) : null}
                        {nb.growthStage ? (
                          <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                            {GROWTH_STAGE_LABEL[nb.growthStage] ??
                              nb.growthStage}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                  {isOwner ? (
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {showHarvestPanel(nb) ? (
                      <button
                        type="button"
                        onClick={() => setHarvestWizardOpen(true)}
                        className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-sm font-medium text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)]"
                      >
                        Harvest log
                      </button>
                    ) : null}
                    <Link
                      href={`/notebooks/${encodeURIComponent(nb.id)}/edit`}
                      className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-sm font-medium text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)]"
                    >
                      Edit setup
                    </Link>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(true)}
                      className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-sm font-medium text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)]"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWeekWizardMode("create");
                        setWeekEditTarget(null);
                        setWeekWizardOpen(true);
                      }}
                      className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 shadow-sm hover:bg-emerald-400"
                    >
                      Add week
                    </button>
                  </div>
                ) : null}
                </div>

              {isOwner && showStartVegetation(nb) ? (
                <div className="mt-4 rounded-xl border border-emerald-500/40 bg-[color-mix(in_srgb,var(--gn-accent)_8%,var(--gn-surface-muted))] p-4">
                  <p className="text-sm font-medium text-[var(--gn-text)]">
                    Ready for vegetation?
                  </p>
                  <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
                    You&apos;ve logged two germination weeks. Continue to
                    vegetation to track the next phase.
                  </p>
                  <button
                    type="button"
                    onClick={() => void transitionToVegetation()}
                    className="mt-3 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
                  >
                    Start vegetation
                  </button>
                </div>
              ) : null}

              {isOwner && showStartFlowering(nb) ? (
                <div className="mt-4 rounded-xl border border-emerald-500/40 bg-[color-mix(in_srgb,var(--gn-accent)_8%,var(--gn-surface-muted))] p-4">
                  <p className="text-sm font-medium text-[var(--gn-text)]">
                    Start flowering
                  </p>
                  <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
                    Two vegetation weeks logged—move to flower to unlock the
                    harvest log.
                  </p>
                  <button
                    type="button"
                    onClick={() => void transitionToFlowering()}
                    className="mt-3 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
                  >
                    Start flowering
                  </button>
                </div>
              ) : null}

              <div className="mt-4 lg:hidden">
                <div className="rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface)]/40 p-3">
                  <NotebookWeekSidebar weeks={nb.weeks} variant="mobile" />
                </div>
              </div>
              </div>
            </div>
          </div>

      {showGrowingSetup ? (
        <section className="mt-8 rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-[var(--gn-text)]">
            Growing setup
          </h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {nb.roomType ? (
              <StatTile label="Room">{nb.roomType}</StatTile>
            ) : null}
            {nb.wateringType ? (
              <StatTile label="Watering">{nb.wateringType}</StatTile>
            ) : null}
            {nb.startType ? (
              <StatTile label="Started from">{nb.startType}</StatTile>
            ) : null}
            {nb.plantCount != null ? (
              <StatTile label="Plants">{nb.plantCount}</StatTile>
            ) : null}
            {nb.totalLightWatts ? (
              <StatTile label="Total light">{`${nb.totalLightWatts} W`}</StatTile>
            ) : null}
            {nb.vegLightCycle?.trim() ? (
              <StatTile label="Veg light schedule">
                {nb.vegLightCycle.trim()}
              </StatTile>
            ) : null}
            {nb.flowerLightCycle?.trim() ? (
              <StatTile label="Flower light schedule">
                {nb.flowerLightCycle.trim()}
              </StatTile>
            ) : null}
          </div>
          {nb.setupNotes?.trim() ? (
            <div className="mt-4 rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)]/50 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
                Setup notes
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--gn-text)]">
                {nb.setupNotes}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {(nb.harvestDryWeightG ||
        nb.harvestQualityNotes?.trim() ||
        (nb.harvestImageUrls && nb.harvestImageUrls.length > 0)) && (
        <section className="mt-8 rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-[var(--gn-text)]">
            Harvest
          </h2>
          {(nb.harvestDryWeightG || nb.gPerWatt || nb.gPerWattPerPlant) && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {nb.harvestDryWeightG ? (
                <StatTile label="Dry weight">{`${nb.harvestDryWeightG} g`}</StatTile>
              ) : null}
              {nb.gPerWatt ? (
                <StatTile label="g / W">{nb.gPerWatt}</StatTile>
              ) : null}
              {nb.gPerWattPerPlant ? (
                <StatTile label="g / W / plant">{nb.gPerWattPerPlant}</StatTile>
              ) : null}
            </div>
          )}
          {nb.harvestQualityNotes ? (
            <div className="mt-4 rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)]/50 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
                Quality notes
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--gn-text)]">
                {nb.harvestQualityNotes}
              </p>
            </div>
          ) : null}
          {nb.harvestImageUrls && nb.harvestImageUrls.length > 0 ? (
            <div className="mt-4">
              <PostMediaCarousel
                embedded
                items={weekImagesAsPostMedia(nb.harvestImageUrls)}
              />
            </div>
          ) : null}
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[var(--gn-text)]">Weeks</h2>
        {nb.weeks.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--gn-text-muted)]">
            No weekly entries yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-6">
            {nb.weeks.map((w) => (
              <li
                key={w.id}
                id={`week-${w.weekIndex}`}
                className="scroll-mt-24 rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[var(--gn-text)]">
                    Week {w.weekIndex}
                  </p>
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => {
                        setWeekWizardMode("edit");
                        setWeekEditTarget(w);
                        setWeekWizardOpen(true);
                      }}
                      className="text-xs font-medium text-emerald-500 hover:underline"
                    >
                      Edit week
                    </button>
                  ) : null}
                </div>
                {w.notes ? (
                  <div className="mt-3 rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)]/50 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
                      Notes
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--gn-text)]">
                      {w.notes}
                    </p>
                  </div>
                ) : null}
                {(() => {
                  const envTiles: { label: string; node: ReactNode }[] = [];
                  if (w.tempC != null && w.tempC !== "") {
                    envTiles.push({
                      label: "Temp",
                      node: (
                        <>
                          {tempCToDisplay(preferredTempUnit, w.tempC)}{" "}
                          {tempSuffix(preferredTempUnit)}
                        </>
                      ),
                    });
                  }
                  if (w.humidityPct != null && w.humidityPct !== "") {
                    envTiles.push({
                      label: "Humidity",
                      node: `${w.humidityPct}% RH`,
                    });
                  }
                  if (w.ph != null && w.ph !== "") {
                    envTiles.push({ label: "pH", node: w.ph });
                  }
                  if (w.ec != null && w.ec !== "") {
                    envTiles.push({ label: "EC", node: w.ec });
                  }
                  if (w.ppm != null && w.ppm !== "") {
                    envTiles.push({ label: "PPM / TDS", node: w.ppm });
                  }
                  const feedTiles: { label: string; node: ReactNode }[] = [];
                  if (
                    w.waterVolumeLiters != null &&
                    String(w.waterVolumeLiters).trim() !== ""
                  ) {
                    feedTiles.push({
                      label: "Water / feed volume",
                      node: (
                        <>
                          {litersToDisplayVolume(
                            preferredVolumeUnit,
                            w.waterVolumeLiters,
                          )}{" "}
                          {volumeSuffix(preferredVolumeUnit)}
                        </>
                      ),
                    });
                  }
                  if (w.waterNotes != null && w.waterNotes !== "") {
                    feedTiles.push({
                      label: "Water / feed notes",
                      node: (
                        <span className="whitespace-pre-wrap font-normal">
                          {w.waterNotes}
                        </span>
                      ),
                    });
                  }
                  const hasMetrics = envTiles.length > 0 || feedTiles.length > 0;
                  if (!hasMetrics) return null;
                  return (
                    <div className="mt-4 space-y-4">
                      {envTiles.length > 0 ? (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
                            Environment
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                            {envTiles.map((t) => (
                              <StatTile key={t.label} label={t.label}>
                                {t.node}
                              </StatTile>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {feedTiles.length > 0 ? (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
                            Feed &amp; water
                          </p>
                          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {feedTiles.map((t) => (
                              <StatTile key={t.label} label={t.label}>
                                {t.node}
                              </StatTile>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
                {w.nutrients.length > 0 ? (
                  <div className="mt-4 rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)]/40 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
                      Nutrients
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm text-[var(--gn-text)]">
                      {w.nutrients.map((x, i) => (
                        <li
                          key={i}
                          className="flex flex-wrap gap-x-2 gap-y-0.5 border-b border-[var(--gn-divide)]/60 pb-1.5 last:border-0 last:pb-0"
                        >
                          <span className="font-medium">
                            {x.productName ?? x.customLabel ?? "—"}
                          </span>
                          {x.dosage ? (
                            <span className="text-[var(--gn-text-muted)]">
                              {x.dosage}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {w.imageUrls?.length ? (
                  <div className="mt-4">
                    <PostMediaCarousel
                      embedded
                      items={weekImagesAsPostMedia(w.imageUrls)}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 border-t border-[var(--gn-divide)] pt-8">
        <h2 className="text-lg font-semibold text-[var(--gn-text)]">
          Comments
        </h2>
        <ul className="mt-4 space-y-4">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-3 py-2"
            >
              <p className="text-xs text-[var(--gn-text-muted)]">
                {c.author.displayName?.trim() || "Member"} ·{" "}
                {new Date(c.createdAt).toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-[var(--gn-text)]">{c.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            rows={3}
            className="gn-input w-full resize-y text-sm"
            placeholder={viewerId ? "Add a comment" : "Sign in to comment"}
            disabled={!viewerId || commentBusy}
          />
          <button
            type="button"
            disabled={!viewerId || commentBusy || !commentBody.trim()}
            onClick={() => void submitComment()}
            className="mt-2 inline-flex rounded-full bg-[#ff4500] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {commentBusy ? "Posting…" : "Comment"}
          </button>
        </div>
      </section>

          {isOwner ? (
            <>
              <NotebookSetupWizard
                open={setupWizardOpen}
                notebook={nb}
                onClose={() => {
                  setSetupWizardOpen(false);
                  clearSetupQuery();
                }}
                onCompleted={async () => {
                  setSetupWizardOpen(false);
                  await reloadNotebook();
                  router.refresh();
                  clearSetupQuery();
                }}
              />
              <NotebookWeekWizard
                open={weekWizardOpen}
                notebookId={nb.id}
                mode={weekWizardMode}
                existingWeek={weekEditTarget}
                nextWeekIndex={nextWeekIndex}
                preferredTempUnit={preferredTempUnit}
                preferredVolumeUnit={preferredVolumeUnit}
                onClose={() => setWeekWizardOpen(false)}
                onSaved={() => {
                  setWeekWizardOpen(false);
                  void reloadNotebook();
                }}
              />
              <NotebookHarvestWizard
                open={harvestWizardOpen}
                notebook={nb}
                notebookId={nb.id}
                onClose={() => setHarvestWizardOpen(false)}
                onSaved={() => {
                  setHarvestWizardOpen(false);
                  void reloadNotebook();
                }}
              />
              <NotebookSettingsModal
                open={settingsOpen}
                notebook={nb}
                onClose={() => setSettingsOpen(false)}
                onSaved={() => {
                  setSettingsOpen(false);
                  void reloadNotebook();
                }}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
