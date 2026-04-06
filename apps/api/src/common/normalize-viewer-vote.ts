/** Coerce Drizzle / driver oddities and dropped nulls into -1 | 1 | null. */
export function normalizeViewerVote(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n === 1 || n === -1) return n;
  return null;
}

/** Read viewer vote from a select row (camelCase key or SQL alias snake_case). */
export function viewerVoteFromRow(row: Record<string, unknown>): number | null {
  const raw = row.viewerVote ?? row.viewer_vote;
  return normalizeViewerVote(raw);
}
