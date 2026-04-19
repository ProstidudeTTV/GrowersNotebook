/** Escape `%` and `_` for PostgreSQL `ILIKE` / `LIKE` patterns (user-supplied fragments). */
export function escapeIlikePattern(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}
