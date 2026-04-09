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
  weekLogPhase,
  weekPhaseCardClass,
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
import { WeekNotesExpandable } from "@/components/notebooks/week-notes-expandable";
import { PostMediaCarousel } from "@/components/post-media-carousel";
import type { PostMediaItem } from "@/lib/feed-post";

type WeekNut = {
  customLabel: string | null;
  dosage: string | null;
  productName: string | null;
};

type WeekNoteSpot = { body: string; at: string };

type Week = {
  id: string;
  weekIndex: number;
  /** Up to three timestamped updates from API; legacy rows may only have `notes`. */
  noteSpots?: WeekNoteSpot[];
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
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

const sectionCapsClass =
  "text-[10px] font-semibold uppercase tracking-wider text-[var(--gn-text-muted)]";

/** Short rule only under the heading text (not full card width). */
function SectionCapsTitle({
  children,
  underlined,
  className = "",
}: {
  children: ReactNode;
  underlined?: boolean;
  className?: string;
}) {
  return (
    <p
      className={`${sectionCapsClass} inline-block w-fit max-w-full ${
        underlined
          ? "border-b border-[var(--gn-divide)]/45 pb-1.5"
          : ""
      } ${className}`.trim()}
    >
      {children}
    </p>
  );
}

/** Structured metric grid (old diary layout) without bordered cells. */
function MetricGrid({
  title,
  titleDivider,
  items,
  metricsFlow = "grid",
  gridClass = "grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4",
  rootClassName = "mt-2",
}: {
  /** Omit when the parent heading already names the section (e.g. Growing setup). */
  title?: string;
  /** Subtle rule under the title (subsection emphasis), only as wide as the label. */
  titleDivider?: boolean;
  /** `wrap` lays out metrics in a horizontal flow to save vertical space. */
  metricsFlow?: "grid" | "wrap";
  items: { label: string; value: ReactNode; wide?: boolean }[];
  gridClass?: string;
  rootClassName?: string;
}) {
  if (!items.length) return null;
  const isWrap = metricsFlow === "wrap";
  return (
    <div className={rootClassName}>
      {title ? (
        <SectionCapsTitle underlined={titleDivider}>{title}</SectionCapsTitle>
      ) : null}
      <dl
        className={`${title ? "mt-2 " : ""}${
          isWrap ? "flex flex-wrap gap-x-5 gap-y-2" : `grid ${gridClass}`
        }`}
      >
        {items.map((item) => (
          <div
            key={item.label}
            className={
              isWrap
                ? `min-w-0 shrink-0 ${item.wide ? "basis-full sm:basis-auto sm:min-w-[12rem]" : ""}`
                : `min-w-0 ${item.wide ? "sm:col-span-2" : ""}`
            }
          >
            <dt className="text-[9px] font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
              {item.label}
            </dt>
            <dd
              className={`text-sm font-medium text-[var(--gn-text)] ${
                isWrap ? "mt-0.5" : "mt-1"
              }`}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function weekImagesAsPostMedia(urls: string[] | undefined): PostMediaItem[] {
  if (!urls?.length) return [];
  return urls
    .filter(Boolean)
    .map((url) => ({ url, type: "image" as const }));
}

function formatNotebookWeekInstant(iso: string | undefined | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function weekEntryWasEdited(
  created: string | undefined | null,
  updated: string | undefined | null,
): boolean {
  if (!created || !updated) return false;
  return new Date(updated).getTime() - new Date(created).getTime() > 1500;
}

function weekNoteSpotsFromRow(w: Week): WeekNoteSpot[] {
  const spots = w.noteSpots;
  if (Array.isArray(spots) && spots.length > 0) {
    const out: WeekNoteSpot[] = [];
    for (const s of spots.slice(0, 3)) {
      const body = String(s?.body ?? "").trim();
      if (!body) continue;
      const raw = s?.at;
      const at =
        typeof raw === "string" && !Number.isNaN(Date.parse(raw))
          ? new Date(raw).toISOString()
          : w.createdAt
            ? new Date(w.createdAt).toISOString()
            : new Date().toISOString();
      out.push({ body, at });
    }
    return out;
  }
  if (w.notes?.trim()) {
    const at =
      w.createdAt && !Number.isNaN(Date.parse(w.createdAt))
        ? new Date(w.createdAt).toISOString()
        : new Date().toISOString();
    return [{ body: w.notes.trim(), at }];
  }
  return [];
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
    <div className="mx-auto max-w-6xl px-4 py-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
        <aside className="order-2 hidden w-[11.25rem] shrink-0 lg:order-1 lg:block lg:self-start lg:sticky lg:top-20 lg:z-10 lg:max-h-[calc(min(100dvh,100vh)-5rem)] xl:top-24">
          <div className="max-h-[min(calc(100dvh-5.5rem),calc(100vh-5.5rem))] overflow-y-auto overflow-x-hidden overscroll-contain rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-2.5 [-ms-overflow-style:none] [scrollbar-width:thin]">
            <NotebookWeekSidebar notebook={nb} weeks={nb.weeks} variant="sidebar" />
          </div>
        </aside>

        <div className="order-1 min-w-0 flex-1 lg:order-2">
          <div className="flex gap-2.5 sm:gap-3">
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
              <div className="rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-3 shadow-sm sm:p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h1 className="text-lg font-bold leading-snug text-[var(--gn-text)] sm:text-xl">
                      {nb.title}
                    </h1>
                    <p className="mt-1 text-xs text-[var(--gn-text-muted)] sm:text-sm">
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
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {strainLabel ? (
                          <span className="rounded-full border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-px text-[11px] font-medium text-[var(--gn-text)]">
                            {strainLabel}
                          </span>
                        ) : null}
                        {nb.growthStage ? (
                          <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-px text-[11px] font-medium text-emerald-400">
                            {GROWTH_STAGE_LABEL[nb.growthStage] ??
                              nb.growthStage}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                  {isOwner ? (
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {showHarvestPanel(nb) ? (
                      <button
                        type="button"
                        onClick={() => setHarvestWizardOpen(true)}
                        className="rounded-md border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1 text-xs font-medium text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)]"
                      >
                        Harvest log
                      </button>
                    ) : null}
                    <Link
                      href={`/notebooks/${encodeURIComponent(nb.id)}/edit`}
                      className="rounded-md border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1 text-xs font-medium text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)]"
                    >
                      Edit setup
                    </Link>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(true)}
                      className="rounded-md border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1 text-xs font-medium text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)]"
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
                      className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-neutral-950 shadow-sm hover:bg-emerald-400"
                    >
                      Add week
                    </button>
                  </div>
                ) : null}
                </div>

              {isOwner && showStartVegetation(nb) ? (
                <div className="mt-3 rounded-lg border border-emerald-500/40 bg-[color-mix(in_srgb,var(--gn-accent)_8%,var(--gn-surface-muted))] p-3">
                  <p className="text-xs font-medium text-[var(--gn-text)]">
                    Ready for vegetation?
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--gn-text-muted)]">
                    You&apos;ve logged a germination week. Continue to vegetation
                    to track the next phase.
                  </p>
                  <button
                    type="button"
                    onClick={() => void transitionToVegetation()}
                    className="mt-2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-neutral-950 hover:bg-emerald-400"
                  >
                    Start vegetation
                  </button>
                </div>
              ) : null}

              {isOwner && showStartFlowering(nb) ? (
                <div className="mt-3 rounded-lg border border-emerald-500/40 bg-[color-mix(in_srgb,var(--gn-accent)_8%,var(--gn-surface-muted))] p-3">
                  <p className="text-xs font-medium text-[var(--gn-text)]">
                    Start flowering
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--gn-text-muted)]">
                    Two vegetation weeks logged—move to flower to unlock the
                    harvest log.
                  </p>
                  <button
                    type="button"
                    onClick={() => void transitionToFlowering()}
                    className="mt-2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-neutral-950 hover:bg-emerald-400"
                  >
                    Start flowering
                  </button>
                </div>
              ) : null}

              <div className="mt-2 lg:hidden">
                <div className="rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface)]/40 p-2">
                  <NotebookWeekSidebar notebook={nb} weeks={nb.weeks} variant="mobile" />
                </div>
              </div>
              </div>
            </div>
          </div>

      {showGrowingSetup ? (
        <section className="mt-5 rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-3 sm:p-3.5">
          <h2 className="text-xs font-semibold text-[var(--gn-text)]">
            Growing setup
          </h2>
          <MetricGrid
            metricsFlow="wrap"
            gridClass="grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3"
            items={[
              ...(nb.roomType
                ? [{ label: "Room", value: nb.roomType }]
                : []),
              ...(nb.wateringType
                ? [{ label: "Watering", value: nb.wateringType }]
                : []),
              ...(nb.startType
                ? [{ label: "Started from", value: nb.startType }]
                : []),
              ...(nb.plantCount != null
                ? [{ label: "Plants", value: nb.plantCount }]
                : []),
              ...(nb.totalLightWatts
                ? [{ label: "Total light", value: `${nb.totalLightWatts} W` }]
                : []),
              ...(nb.vegLightCycle?.trim()
                ? [{ label: "Veg light schedule", value: nb.vegLightCycle.trim() }]
                : []),
              ...(nb.flowerLightCycle?.trim()
                ? [
                    {
                      label: "Flower light schedule",
                      value: nb.flowerLightCycle.trim(),
                    },
                  ]
                : []),
            ]}
          />
          {nb.setupNotes?.trim() ? (
            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gn-text-muted)]">
                Setup notes
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--gn-text)]">
                {nb.setupNotes}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {(nb.harvestDryWeightG ||
        nb.harvestQualityNotes?.trim() ||
        (nb.harvestImageUrls && nb.harvestImageUrls.length > 0)) && (
        <section className="mt-5 rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-3 sm:p-3.5">
          <h2 className="text-xs font-semibold text-[var(--gn-text)]">
            Harvest
          </h2>
          <MetricGrid
            gridClass="grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3"
            items={[
              ...(nb.harvestDryWeightG
                ? [{ label: "Dry weight", value: `${nb.harvestDryWeightG} g` }]
                : []),
              ...(nb.gPerWatt ? [{ label: "g / W", value: nb.gPerWatt }] : []),
              ...(nb.gPerWattPerPlant
                ? [{ label: "g / W / plant", value: nb.gPerWattPerPlant }]
                : []),
            ]}
          />
          {nb.harvestQualityNotes ? (
            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gn-text-muted)]">
                Quality notes
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--gn-text)]">
                {nb.harvestQualityNotes}
              </p>
            </div>
          ) : null}
          {nb.harvestImageUrls && nb.harvestImageUrls.length > 0 ? (
            <div className="mt-2">
              <PostMediaCarousel
                embedded
                items={weekImagesAsPostMedia(nb.harvestImageUrls)}
              />
            </div>
          ) : null}
        </section>
      )}

      <section className="mt-5">
        <h2 className="text-base font-semibold text-[var(--gn-text)]">Weeks</h2>
        {nb.weeks.length === 0 ? (
          <p className="mt-1.5 text-xs text-[var(--gn-text-muted)]">
            No weekly entries yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {nb.weeks.map((w) => {
              const phase = weekLogPhase(nb, w.weekIndex);
              const phaseClass = weekPhaseCardClass(phase);
              const spots = weekNoteSpotsFromRow(w);
              const hasNotes = spots.length > 0;
              const envItems: { key: string; value: ReactNode }[] = [];
              if (w.tempC != null && w.tempC !== "") {
                envItems.push({
                  key: "Temp",
                  value: (
                    <>
                      {tempCToDisplay(preferredTempUnit, w.tempC)}{" "}
                      {tempSuffix(preferredTempUnit)}
                    </>
                  ),
                });
              }
              if (w.humidityPct != null && w.humidityPct !== "") {
                envItems.push({
                  key: "Humidity",
                  value: `${w.humidityPct}% RH`,
                });
              }
              if (w.ph != null && w.ph !== "") {
                envItems.push({ key: "pH", value: w.ph });
              }
              if (w.ec != null && w.ec !== "") {
                envItems.push({ key: "EC", value: w.ec });
              }
              if (w.ppm != null && w.ppm !== "") {
                envItems.push({ key: "PPM", value: w.ppm });
              }

              const feedLineItems: { key: string; value: ReactNode }[] = [];
              if (
                w.waterVolumeLiters != null &&
                String(w.waterVolumeLiters).trim() !== ""
              ) {
                feedLineItems.push({
                  key: "Volume",
                  value: (
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

              const feedItems: {
                label: string;
                value: ReactNode;
                wide?: boolean;
              }[] = [];
              if (feedLineItems.length > 0) {
                feedItems.push({
                  label: "Water / feed volume",
                  value: feedLineItems[0].value,
                });
              }
              if (w.waterNotes != null && w.waterNotes !== "") {
                feedItems.push({
                  label: "Water / feed notes",
                  value: (
                    <span className="whitespace-pre-wrap font-normal">
                      {w.waterNotes}
                    </span>
                  ),
                  wide: true,
                });
              }

              const showEnv = envItems.length > 0;
              const showFeed = feedItems.length > 0;
              const noteSpotsForExpandable = spots.map((s) => ({
                body: s.body,
                at: s.at,
              }));
              const weekBodyLgGrid =
                showEnv && showFeed
                  ? "lg:grid-cols-3"
                  : showEnv || showFeed
                    ? "lg:grid-cols-2"
                    : "lg:grid-cols-1";

              return (
              <li
                key={w.id}
                id={`week-${w.weekIndex}`}
                className={`scroll-mt-20 rounded-lg px-3 py-2 sm:px-3.5 sm:py-2.5 ${phaseClass}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="w-fit max-w-[min(100%,42rem)] min-w-0 border-b border-[var(--gn-divide)]/40 pb-1.5">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                      <p className="text-sm font-semibold tracking-tight text-[var(--gn-text)]">
                        Week {w.weekIndex}
                      </p>
                      <span className="text-[10px] font-medium text-[var(--gn-text-muted)]">
                        {GROWTH_STAGE_LABEL[phase] ?? phase}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] leading-snug text-[var(--gn-text-muted)]">
                      {w.createdAt ? (
                        <time dateTime={w.createdAt}>
                          {formatNotebookWeekInstant(w.createdAt)}
                        </time>
                      ) : null}
                      {weekEntryWasEdited(w.createdAt, w.updatedAt) ? (
                        <span className="ml-1.5 font-medium text-[var(--gn-text-muted)]">
                          (edited)
                        </span>
                      ) : null}
                    </p>
                  </div>
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => {
                        setWeekWizardMode("edit");
                        setWeekEditTarget(w);
                        setWeekWizardOpen(true);
                      }}
                      className="shrink-0 text-[11px] font-medium text-emerald-400/90 hover:text-emerald-300 hover:underline"
                    >
                      Edit week
                    </button>
                  ) : null}
                </div>

                <div
                  className={`mt-2 flex flex-col gap-4 lg:grid lg:items-start lg:gap-x-4 xl:gap-x-5 ${weekBodyLgGrid}`}
                >
                  {showEnv ? (
                    <div className="min-w-0">
                      <MetricGrid
                        title="Environment"
                        titleDivider
                        metricsFlow="wrap"
                        rootClassName="mt-0"
                        items={envItems.map((x) => ({
                          label: x.key,
                          value: x.value,
                        }))}
                      />
                    </div>
                  ) : null}

                  <div className="min-w-0">
                    {hasNotes ? (
                      <WeekNotesExpandable
                        title={
                          <SectionCapsTitle underlined>
                            {spots.length > 1
                              ? `Updates (${spots.length})`
                              : "Notes"}
                          </SectionCapsTitle>
                        }
                        spots={noteSpotsForExpandable}
                        formatInstant={formatNotebookWeekInstant}
                      />
                    ) : (
                      <div>
                        <SectionCapsTitle underlined>Notes</SectionCapsTitle>
                        <p className="mt-2 text-xs text-[var(--gn-text-muted)]">
                          No notes for this week.
                        </p>
                      </div>
                    )}
                  </div>

                  {showFeed ? (
                    <div className="min-w-0">
                      <MetricGrid
                        title="Feed & water"
                        titleDivider
                        rootClassName="mt-0"
                        gridClass="grid-cols-1 gap-x-3 gap-y-2"
                        items={feedItems}
                      />
                    </div>
                  ) : null}
                </div>

                {w.nutrients.length > 0 ? (
                  <div className="mt-3">
                    <SectionCapsTitle underlined>Nutrients</SectionCapsTitle>
                    <ul className="mt-1.5 list-outside list-disc space-y-0.5 pl-5 text-sm leading-snug text-[var(--gn-text)]">
                      {w.nutrients.map((x, i) => (
                        <li key={i}>
                          <span className="font-medium">
                            {x.productName ?? x.customLabel ?? "—"}
                          </span>
                          {x.dosage ? (
                            <span className="text-[var(--gn-text-muted)]">
                              {" "}
                              — {x.dosage}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {w.imageUrls?.length ? (
                  <div className="mt-2 overflow-hidden rounded-lg">
                    <PostMediaCarousel
                      embedded
                      items={weekImagesAsPostMedia(w.imageUrls)}
                    />
                  </div>
                ) : null}
              </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-6 border-t border-[var(--gn-divide)] pt-5">
        <h2 className="text-base font-semibold text-[var(--gn-text)]">
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
