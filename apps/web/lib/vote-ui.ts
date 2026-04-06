/** Coerce API / JSON values to the vote tri-state the UI uses. */
export function normalizedViewerVote(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (n === 1) return 1;
  if (n === -1) return -1;
  return null;
}

/** POST /votes/* body: refreshed tallies + viewerVote (camel or snake). */
export type VoteMutationResponse = {
  score: number;
  upvotes: number;
  downvotes: number;
  viewerVote: number | null;
};

/** Normalize viewer vote from API objects (camel or snake). */
export function pickViewerVote(data: unknown): number | null {
  if (!data || typeof data !== "object") return normalizedViewerVote(null);
  const r = data as Record<string, unknown>;
  return normalizedViewerVote(r.viewerVote ?? r.viewer_vote);
}

/** Toggle: same arrow removes vote; other direction sets that vote. */
export function optimisticVoteClick(
  current: number | null,
  clicked: 1 | -1,
): number | null {
  if (current === clicked) return null;
  return clicked;
}

/** Local tallies after a vote click, before the server responds. */
export function talliesAfterVoteClick(
  upvotes: number,
  downvotes: number,
  prevVote: number | null,
  clicked: 1 | -1,
): { upvotes: number; downvotes: number; score: number; viewerVote: number | null } {
  const next = optimisticVoteClick(prevVote, clicked);
  let u = upvotes;
  let d = downvotes;
  if (prevVote === 1) u -= 1;
  if (prevVote === -1) d -= 1;
  if (next === 1) u += 1;
  if (next === -1) d += 1;
  return { upvotes: u, downvotes: d, score: u - d, viewerVote: next };
}

export function parseVoteMutationResponse(
  res: unknown,
): VoteMutationResponse | null {
  if (!res || typeof res !== "object") return null;
  const r = res as Record<string, unknown>;
  const hasVv = "viewerVote" in r || "viewer_vote" in r;
  const score = Number(r.score);
  const upvotes = Number(r.upvotes);
  const downvotes = Number(r.downvotes);
  const hasMetrics =
    Number.isFinite(score) &&
    Number.isFinite(upvotes) &&
    Number.isFinite(downvotes);
  if (!hasVv || !hasMetrics) return null;
  return {
    score,
    upvotes,
    downvotes,
    viewerVote: normalizedViewerVote(r.viewerVote ?? r.viewer_vote),
  };
}
