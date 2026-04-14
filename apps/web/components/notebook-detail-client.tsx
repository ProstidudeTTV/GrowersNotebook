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
import { CommentDiscussionComposer } from "@/components/comment-discussion-composer";
import { DmImageLightbox } from "@/components/dm-image-lightbox";
import { PostMediaCarousel } from "@/components/post-media-carousel";
import { StackedDmStyleImages } from "@/components/stacked-dm-style-images";
import { UserProfileLink } from "@/components/user-profile-link";
import type { PostMediaItem } from "@/lib/feed-post";
import { dedupeUrlsPreserveOrder } from "@/lib/dm-media-url";
import { DEFAULT_GROWER_RANK, formatSeeds } from "@/lib/grower-display";

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
  waterings?: {
    id: string | null;
    notes: string | null;
    volumeLiters: string | null;
    sortOrder: number;
  }[];
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
  breeder?: { slug: string; name: string } | null;
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

/** Primary section title (sentence case); underline matches text width only. */
function SectionHeading({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`inline-block w-fit max-w-full border-b border-[var(--gn-divide)]/45 pb-1.5 text-xs font-semibold text-[var(--gn-text)] sm:text-sm ${className}`.trim()}
    >
      {children}
    </h2>
  );
}

function NotebookHeaderAvatar({
  avatarUrl,
  displayName,
}: {
  avatarUrl?: string | null;
  displayName: string | null;
}) {
  const label = (displayName ?? "Grower").trim();
  const initial = label.charAt(0).toUpperCase() || "?";
  const frame =
    "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--gn-surface-elevated)] text-sm font-semibold text-[var(--gn-text)] ring-1 ring-[var(--gn-ring)] sm:h-12 sm:w-12";
  if (avatarUrl?.trim()) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={avatarUrl.trim()}
        alt=""
        className={`${frame} object-cover`}
      />
    );
  }
  return (
    <span className={frame} aria-hidden>
      {initial}
    </span>
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
  const [commentLightbox, setCommentLightbox] = useState<{
    urls: string[];
    index: number;
  } | null>(null);
  const [commentComposerError, setCommentComposerError] = useState<
    string | null
  >(null);

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
  const [commentDeletingId, setCommentDeletingId] = useState<string | null>(null);
  const [weekDeletingId, setWeekDeletingId] = useState<string | null>(null);

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

  const deleteOwnComment = async (commentId: string) => {
    if (!viewerId) {
      router.push("/login");
      return;
    }
    if (!window.confirm("Remove your comment?")) return;
    setCommentDeletingId(commentId);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) throw new Error("Sign in.");
      await apiFetch(`/notebooks/${nb.id}/comments/${commentId}`, {
        method: "DELETE",
        token,
      });
      await reloadComments();
    } catch {
      /* ignore */
    } finally {
      setCommentDeletingId(null);
    }
  };

  const deleteWeekEntry = async (w: WeekRow) => {
    if (!viewerId) return;
    if (
      !window.confirm(
        `Delete week ${w.weekIndex}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setWeekDeletingId(w.id);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) throw new Error("Sign in.");
      await apiFetch(`/notebooks/${nb.id}/weeks/${w.id}`, {
        method: "DELETE",
        token,
      });
      await reloadNotebook();
    } catch {
      /* ignore */
    } finally {
      setWeekDeletingId(null);
    }
  };

  const submitNotebookComment = async (payload: {
    body: string;
    imageUrls: string[];
  }) => {
    if (!viewerId) {
      router.push("/login");
      throw new Error("Sign in.");
    }
    const supabase = createClient();
    const token = await getAccessTokenForApi(supabase);
    if (!token) throw new Error("Sign in.");
    const body: { body: string; imageUrls?: string[] } = {
      body: payload.body,
    };
    if (payload.imageUrls.length > 0) body.imageUrls = payload.imageUrls;
    await apiFetch(`/notebooks/${nb.id}/comments`, {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
    await reloadComments();
    router.refresh();
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
        <aside className="order-2 hidden h-fit w-[11.25rem] shrink-0 lg:order-1 lg:block lg:self-start lg:sticky lg:top-24 lg:z-20 lg:max-h-[calc(min(100dvh,100vh)-6.5rem)] xl:top-28">
          <div className="max-h-[min(calc(100dvh-7rem),calc(100vh-7rem))] overflow-y-auto overflow-x-hidden overscroll-contain rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-2.5 [-ms-overflow-style:none] [scrollbar-width:thin]">
            <NotebookWeekSidebar notebook={nb} weeks={nb.weeks} variant="sidebar" />
          </div>
        </aside>

        <div className="order-1 min-w-0 flex-1 lg:order-2">
              <div className="w-full rounded-2xl border border-[var(--gn-border)] bg-gradient-to-br from-[var(--gn-surface-muted)] to-[var(--gn-surface)] p-3 shadow-sm ring-1 ring-black/5 dark:ring-white/5 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
                  <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                    <NotebookHeaderAvatar
                      avatarUrl={nb.owner.avatarUrl}
                      displayName={nb.owner.displayName}
                    />
                    <div className="min-w-0 flex-1">
                      <h1 className="text-lg font-bold leading-snug text-[var(--gn-text)] sm:text-xl">
                        {nb.title}
                      </h1>
                      <p className="mt-1 text-xs text-[var(--gn-text-muted)] sm:text-sm">
                        <Link
                          href={`/u/${encodeURIComponent(nb.ownerId)}`}
                          className="font-medium text-[#ff4500] hover:underline"
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
                              {nb.strain.name?.trim() ||
                                strainLabel ||
                                "Strain"}
                            </Link>
                          </>
                        ) : strainLabel ? (
                          <>
                            {" "}
                            · {strainLabel}
                          </>
                        ) : null}
                        {nb.breeder ? (
                          <>
                            {" "}
                            ·{" "}
                            <Link
                              href={`/breeders/${encodeURIComponent(nb.breeder.slug)}`}
                              className="text-[#ff4500] hover:underline"
                            >
                              {nb.breeder.name}
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
                  </div>
                  <div className="flex w-full shrink-0 flex-col items-start gap-2 sm:w-auto sm:items-end">
                    <VoteFeedPill
                      score={nb.score}
                      upvotes={nb.upvotes}
                      downvotes={nb.downvotes}
                      viewerVote={nb.viewerVote}
                      onUp={() => void vote(1)}
                      onDown={() => void vote(-1)}
                      disabled={voteBusy}
                    />
                    {isOwner ? (
                      <div className="flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto">
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

      {showGrowingSetup ? (
        <section className="mt-5 rounded-2xl border border-[var(--gn-border)] bg-gradient-to-br from-[var(--gn-surface-muted)] to-[var(--gn-surface)] p-3 shadow-sm ring-1 ring-black/5 dark:ring-white/5 sm:p-3.5">
          <SectionHeading>Growing setup</SectionHeading>
          <MetricGrid
            metricsFlow="wrap"
            rootClassName="mt-2"
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
              <SectionCapsTitle underlined>Setup notes</SectionCapsTitle>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--gn-text)]">
                {nb.setupNotes}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {(nb.harvestDryWeightG ||
        nb.harvestQualityNotes?.trim() ||
        (nb.harvestImageUrls && nb.harvestImageUrls.length > 0)) && (
        <section className="mt-5 rounded-2xl border border-[var(--gn-border)] bg-gradient-to-br from-[var(--gn-surface-muted)] to-[var(--gn-surface)] p-3 shadow-sm ring-1 ring-black/5 dark:ring-white/5 sm:p-3.5">
          <SectionHeading>Harvest</SectionHeading>
          <MetricGrid
            rootClassName="mt-2"
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
              <SectionCapsTitle underlined>Quality notes</SectionCapsTitle>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--gn-text)]">
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
        <SectionHeading>Weeks</SectionHeading>
        {nb.weeks.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--gn-text-muted)]">
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

              const feedItems: {
                label: string;
                value: ReactNode;
                wide?: boolean;
              }[] = [];
              const waterRows =
                w.waterings && w.waterings.length > 0
                  ? w.waterings
                  : w.waterVolumeLiters != null &&
                      String(w.waterVolumeLiters).trim() !== ""
                    ? [
                        {
                          notes: w.waterNotes ?? null,
                          volumeLiters: w.waterVolumeLiters,
                          sortOrder: 0,
                        },
                      ]
                    : w.waterNotes != null && w.waterNotes !== ""
                      ? [
                          {
                            notes: w.waterNotes,
                            volumeLiters: null,
                            sortOrder: 0,
                          },
                        ]
                      : [];
              waterRows.forEach((row, idx) => {
                const label =
                  waterRows.length > 1
                    ? `Watering ${idx + 1}`
                    : "Water / feed";
                const bits: ReactNode[] = [];
                if (
                  row.volumeLiters != null &&
                  String(row.volumeLiters).trim() !== ""
                ) {
                  bits.push(
                    <span key="v">
                      {litersToDisplayVolume(
                        preferredVolumeUnit,
                        row.volumeLiters,
                      )}{" "}
                      {volumeSuffix(preferredVolumeUnit)}
                    </span>,
                  );
                }
                if (row.notes != null && row.notes.trim() !== "") {
                  bits.push(
                    <span
                      key="n"
                      className="block whitespace-pre-wrap font-normal"
                    >
                      {row.notes}
                    </span>,
                  );
                }
                if (bits.length === 0) return;
                feedItems.push({
                  label,
                  value:
                    bits.length === 1 ? (
                      bits[0]
                    ) : (
                      <div className="space-y-1">{bits}</div>
                    ),
                  wide: true,
                });
              });

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
                className={`scroll-mt-20 rounded-2xl px-3 py-2.5 shadow-sm ring-1 ring-black/5 sm:px-4 sm:py-3 dark:ring-white/5 ${phaseClass}`}
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
                    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setWeekWizardMode("edit");
                          setWeekEditTarget(w);
                          setWeekWizardOpen(true);
                        }}
                        className="text-[11px] font-medium text-emerald-400/90 hover:text-emerald-300 hover:underline"
                      >
                        Edit week
                      </button>
                      <button
                        type="button"
                        disabled={weekDeletingId === w.id}
                        onClick={() => void deleteWeekEntry(w)}
                        className="text-[11px] font-medium text-red-400/90 hover:text-red-300 hover:underline disabled:opacity-45"
                      >
                        {weekDeletingId === w.id ? "Deleting…" : "Delete week"}
                      </button>
                    </div>
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

      <section id="comments" className="mt-6 scroll-mt-24 pt-2 sm:scroll-mt-28">
        {commentLightbox ? (
          <DmImageLightbox
            urls={commentLightbox.urls}
            initialIndex={commentLightbox.index}
            onClose={() => setCommentLightbox(null)}
          />
        ) : null}
        <SectionHeading>Comments</SectionHeading>
        <ul className="mt-4 space-y-4">
          {comments.map((c) => {
            const imgs = dedupeUrlsPreserveOrder(
              c.imageUrls?.filter(Boolean) ?? [],
            );
            const tier =
              c.author.growerLevel?.trim() || DEFAULT_GROWER_RANK;
            return (
              <li
                key={c.id}
                className="rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-3 py-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="text-xs text-[var(--gn-text-muted)]">
                    <UserProfileLink
                      userId={c.author.id}
                      className="font-medium text-[var(--gn-text)] transition hover:text-[#ff4500] hover:underline"
                    >
                      {c.author.displayName?.trim() || "Member"}
                    </UserProfileLink>
                    <span> · </span>
                    <span title="Grower tier">{tier}</span>
                    <span> · </span>
                    <span title="Net seeds from posts and comments">
                      {formatSeeds(c.author.seeds)} seeds
                    </span>
                    <span> · </span>
                    {new Date(c.createdAt).toLocaleString()}
                  </div>
                  {viewerId && viewerId === c.author.id ? (
                    <button
                      type="button"
                      disabled={commentDeletingId === c.id}
                      onClick={() => void deleteOwnComment(c.id)}
                      className="shrink-0 text-[11px] font-medium text-red-400/90 hover:text-red-300 hover:underline disabled:opacity-45"
                    >
                      {commentDeletingId === c.id ? "Removing…" : "Delete"}
                    </button>
                  ) : null}
                </div>
                {c.body.trim() ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--gn-text)]">
                    {c.body}
                  </p>
                ) : null}
                {imgs.length > 0 ? (
                  <div
                    className={`overflow-visible ${c.body.trim() ? "mt-2.5" : "mt-1"}`}
                  >
                    <StackedDmStyleImages
                      urls={imgs}
                      stackKey={c.id}
                      pileLabel={
                        imgs.length > 1 ? `${imgs.length} photos` : null
                      }
                      onOpen={(index) =>
                        setCommentLightbox({ urls: imgs, index })
                      }
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="mt-4">
          {commentComposerError ? (
            <p className="mb-2 text-sm text-red-600 dark:text-red-400">
              {commentComposerError}
            </p>
          ) : null}
          <CommentDiscussionComposer
            viewerId={viewerId}
            placeholder={
              viewerId ? "Join the discussion…" : "Sign in to comment"
            }
            submitLabel="Comment"
            onSubmit={async (p) => {
              setCommentComposerError(null);
              await submitNotebookComment(p);
            }}
            onSubmitError={(msg) => setCommentComposerError(msg)}
          />
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
                onCompleted={async (_createdId?: string) => {
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
                onDeleted={() => router.push("/notebooks")}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
