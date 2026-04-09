"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { VoteFeedPill } from "@/components/vote-score-rail";
import { apiFetch } from "@/lib/api-public";
import {
  normalizedViewerVote,
  parseVoteMutationResponse,
  talliesAfterVoteClick,
} from "@/lib/vote-ui";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import { GROWTH_STAGE_LABEL } from "@/lib/notebook-growth";

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

export function NotebookDetailClient({
  initial,
}: {
  initial: NotebookDetailPayload;
}) {
  const router = useRouter();
  const [nb, setNb] = useState(initial);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [voteBusy, setVoteBusy] = useState(false);
  const [comments, setComments] = useState<NbComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  useEffect(() => {
    setNb(initial);
  }, [initial]);

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
  const strainLabel =
    nb.strain?.name?.trim() || nb.customStrainLabel?.trim() || null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
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
          <h1 className="text-2xl font-bold text-[var(--gn-text)]">
            {nb.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
            <Link
              href={`/u/${encodeURIComponent(nb.ownerId)}`}
              className="text-[#ff4500] hover:underline"
            >
              {nb.owner.displayName?.trim() || "Grower"}
            </Link>
            {strainLabel ? ` · ${strainLabel}` : ""}
            {nb.growthStage ? (
              <>
                {" "}
                ·{" "}
                <span className="text-[var(--gn-text)]">
                  {GROWTH_STAGE_LABEL[nb.growthStage] ?? nb.growthStage}
                </span>
              </>
            ) : null}
            {nb.strain?.slug ? (
              <>
                {" "}
                <Link
                  href={`/strains/${encodeURIComponent(nb.strain.slug)}`}
                  className="text-[#ff4500] hover:underline"
                >
                  (catalog)
                </Link>
              </>
            ) : null}
          </p>
          {isOwner ? (
            <Link
              href={`/notebooks/${encodeURIComponent(nb.id)}/edit`}
              className="mt-3 inline-block text-sm font-medium text-[#ff4500] hover:underline"
            >
              Edit notebook
            </Link>
          ) : null}
        </div>
      </div>

      {(nb.roomType ||
        nb.wateringType ||
        nb.startType ||
        nb.setupNotes?.trim() ||
        nb.plantCount != null ||
        nb.totalLightWatts) && (
        <section className="mt-8 rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-4">
          <h2 className="text-sm font-semibold text-[var(--gn-text)]">
            Growing setup
          </h2>
          <dl className="mt-2 grid gap-1 text-sm text-[var(--gn-text-muted)]">
            {nb.roomType ? (
              <div>
                Room:{" "}
                <span className="text-[var(--gn-text)]">{nb.roomType}</span>
              </div>
            ) : null}
            {nb.wateringType ? (
              <div>
                Watering:{" "}
                <span className="text-[var(--gn-text)]">{nb.wateringType}</span>
              </div>
            ) : null}
            {nb.startType ? (
              <div>
                Started from:{" "}
                <span className="text-[var(--gn-text)]">{nb.startType}</span>
              </div>
            ) : null}
            {nb.plantCount != null ? (
              <div>
                Plants:{" "}
                <span className="text-[var(--gn-text)]">{nb.plantCount}</span>
              </div>
            ) : null}
            {nb.totalLightWatts ? (
              <div>
                Light:{" "}
                <span className="text-[var(--gn-text)]">
                  {nb.totalLightWatts} W
                </span>
              </div>
            ) : null}
            {nb.setupNotes?.trim() ? (
              <p className="mt-2 whitespace-pre-wrap text-[var(--gn-text)]">
                {nb.setupNotes}
              </p>
            ) : null}
          </dl>
        </section>
      )}

      {(nb.harvestDryWeightG ||
        nb.harvestQualityNotes?.trim() ||
        (nb.harvestImageUrls && nb.harvestImageUrls.length > 0)) && (
        <section className="mt-8 rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-4">
          <h2 className="text-sm font-semibold text-[var(--gn-text)]">
            Harvest
          </h2>
          <dl className="mt-2 grid gap-1 text-sm text-[var(--gn-text-muted)]">
            {nb.harvestDryWeightG ? (
              <div>
                Dry weight:{" "}
                <span className="text-[var(--gn-text)]">
                  {nb.harvestDryWeightG} g
                </span>
              </div>
            ) : null}
            {nb.gPerWatt ? (
              <div>
                g/W:{" "}
                <span className="text-[var(--gn-text)]">{nb.gPerWatt}</span>
              </div>
            ) : null}
            {nb.gPerWattPerPlant ? (
              <div>
                g/W/plant:{" "}
                <span className="text-[var(--gn-text)]">
                  {nb.gPerWattPerPlant}
                </span>
              </div>
            ) : null}
            {nb.harvestQualityNotes ? (
              <p className="mt-2 whitespace-pre-wrap text-[var(--gn-text)]">
                {nb.harvestQualityNotes}
              </p>
            ) : null}
          </dl>
          {nb.harvestImageUrls && nb.harvestImageUrls.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {nb.harvestImageUrls.slice(0, 8).map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block h-28 w-28 overflow-hidden rounded-lg ring-1 ring-[var(--gn-border)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </a>
              ))}
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
                className="rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-4"
              >
                <p className="font-semibold text-[var(--gn-text)]">
                  Week {w.weekIndex}
                </p>
                {w.notes ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--gn-text)]">
                    {w.notes}
                  </p>
                ) : null}
                <ul className="mt-2 text-xs text-[var(--gn-text-muted)]">
                  {w.tempC != null && w.tempC !== "" ? (
                    <li>Temp: {w.tempC} °C</li>
                  ) : null}
                  {w.humidityPct != null && w.humidityPct !== "" ? (
                    <li>RH: {w.humidityPct}%</li>
                  ) : null}
                  {w.ph != null && w.ph !== "" ? <li>pH: {w.ph}</li> : null}
                  {w.ec != null && w.ec !== "" ? <li>EC: {w.ec}</li> : null}
                  {w.ppm != null && w.ppm !== "" ? <li>PPM: {w.ppm}</li> : null}
                  {w.waterNotes != null && w.waterNotes !== "" ? (
                    <li className="whitespace-pre-wrap">
                      Water / feed: {w.waterNotes}
                    </li>
                  ) : null}
                  {w.lightCycle ? <li>Light: {w.lightCycle}</li> : null}
                </ul>
                {w.nutrients.length > 0 ? (
                  <div className="mt-2 text-sm text-[var(--gn-text)]">
                    <p className="text-xs font-medium text-[var(--gn-text-muted)]">
                      Nutrients
                    </p>
                    <ul className="mt-1 list-inside list-disc">
                      {w.nutrients.map((x, i) => (
                        <li key={i}>
                          {(x.productName ?? x.customLabel ?? "—") +
                            (x.dosage ? ` — ${x.dosage}` : "")}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {w.imageUrls?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {w.imageUrls.slice(0, 8).map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block h-24 w-24 overflow-hidden rounded-lg ring-1 ring-[var(--gn-border)]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </a>
                    ))}
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
    </div>
  );
}
