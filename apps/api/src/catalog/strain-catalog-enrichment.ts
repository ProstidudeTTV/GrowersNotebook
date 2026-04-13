/**
 * Shared helpers for strain CSV import and public API shaping:
 * Leafly-style effect percentages, breeder inference from prose, autoflower detection.
 */

export const LEAFLY_EFFECT_PCT_KEYS = [
  ['relaxed', 'Relaxed'],
  ['happy', 'Happy'],
  ['euphoric', 'Euphoric'],
  ['uplifted', 'Uplifted'],
  ['creative', 'Creative'],
  ['focused', 'Focused'],
  ['energetic', 'Energetic'],
  ['talkative', 'Talkative'],
  ['hungry', 'Hungry'],
  ['sleepy', 'Sleepy'],
] as const;

export type ReportedEffectPcts = Partial<
  Record<(typeof LEAFLY_EFFECT_PCT_KEYS)[number][0], number>
>;

/** Parse Leafly CSV columns into 0–100 percentages. */
export function leaflyReportedEffectPctsFromRow(
  row: Record<string, string>,
): ReportedEffectPcts {
  const out: ReportedEffectPcts = {};
  for (const [key] of LEAFLY_EFFECT_PCT_KEYS) {
    const t = row[key]?.trim();
    if (!t || /^n\/a|null|\[null\]$/i.test(t)) continue;
    const n = Number.parseFloat(t.replace(/%/g, ''));
    if (!Number.isFinite(n)) continue;
    out[key] = Math.min(100, Math.max(0, n));
  }
  return out;
}

export function hasAnyReportedEffectPcts(
  p: ReportedEffectPcts | Record<string, number> | null | undefined,
): boolean {
  if (!p || typeof p !== 'object') return false;
  return Object.keys(p).length > 0;
}

/** Prefer DB column; fall back to parsing legacy lab-notes line. */
export function resolveReportedEffectPctsForPublic(row: {
  reportedEffectPcts: unknown;
  effectsNotes: string | null;
}): Record<string, number> | null {
  const raw = row.reportedEffectPcts as Record<string, number> | null | undefined;
  if (hasAnyReportedEffectPcts(raw)) return raw!;
  const parsed = parseLeaflyReportedEffectsLineFromNotes(row.effectsNotes);
  return parsed && Object.keys(parsed).length > 0 ? parsed : null;
}

/** Lab notes for API/UI: drop redundant Leafly line when structured percents exist. */
export function publicEffectsNotesForStrain(row: {
  reportedEffectPcts: unknown;
  effectsNotes: string | null;
}): string | null {
  const pcts = resolveReportedEffectPctsForPublic(row);
  if (hasAnyReportedEffectPcts(pcts)) {
    return stripLeaflyReportedEffectsLineFromNotes(row.effectsNotes);
  }
  return row.effectsNotes ?? null;
}

/**
 * Removes the synthetic Leafly line from lab notes when the same data is stored in
 * `reported_effect_pcts`.
 */
export function stripLeaflyReportedEffectsLineFromNotes(
  notes: string | null | undefined,
): string | null {
  if (notes == null || !String(notes).trim()) return notes ?? null;
  const lines = String(notes).split(/\r?\n/);
  const filtered = lines.filter(
    (l) => !/^\s*Reported effects \(Leafly-style\):/i.test(l.trim()),
  );
  const out = filtered.join('\n').trim();
  return out || null;
}

/**
 * Match breeder credit in catalog prose, e.g. "By Mephisto Genetics", "Bred by Fast Buds".
 */
export function inferBreederNameFromProse(text: string | undefined | null): string | null {
  const t = text?.trim();
  if (!t) return null;
  const patterns: RegExp[] = [
    /\bBred by\s+([A-Za-z0-9][A-Za-z0-9 &.'-]{0,72}?)(?=\s+for\b|\s+to\b|[.,;]|\s-\s|\n|$)/i,
    /(?:^|[.!?]\s+)By\s+([A-Z][A-Za-z0-9&.'-]+(?:\s+[A-Za-z0-9&.'-]+){0,3})(?=[.,;]|\s-\s|\n|$)/i,
    /\bfrom\s+([A-Z][A-Za-z0-9&.'\s-]+(?:\s+Genetics)?)\s+(?:comes|is|was)\b/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m?.[1]) {
      const name = m[1]
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[.,;]+$/g, '')
        .trim();
      if (name.length >= 2 && name.length <= 80) return name;
    }
  }
  return null;
}

const AUTOFLOWER_HAY_KEYS = [
  'flowering_period_type',
  'seed_type',
  'growth_and_harvest',
  'environment',
  'strain_type_summary',
] as const;

export function detectAutoflowerFromRowAndDescription(
  row: Record<string, string>,
  description: string,
): boolean {
  const parts: string[] = [description];
  for (const k of AUTOFLOWER_HAY_KEYS) {
    const v = row[k]?.trim();
    if (v) parts.push(v);
  }
  const hay = parts.join('\n');
  return (
    /\bauto\s*flow(?:er|ering)?s?\b/i.test(hay) ||
    /\bruderalis\b/i.test(hay) ||
    /\bday\s+neutral\b/i.test(hay)
  );
}

/** Parse legacy "Reported effects (Leafly-style): Relaxed 45%, …" into percentages. */
export function parseLeaflyReportedEffectsLineFromNotes(
  notes: string | null | undefined,
): ReportedEffectPcts | null {
  if (!notes?.trim()) return null;
  const line = notes
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => /^\s*Reported effects \(Leafly-style\):/i.test(l));
  if (!line) return null;
  const rest = line.replace(/^\s*Reported effects \(Leafly-style\):\s*/i, '');
  const out: ReportedEffectPcts = {};
  for (const part of rest.split(',')) {
    const seg = part.trim();
    const m = seg.match(/^([A-Za-z]+)\s+([\d.]+%?)/);
    if (!m) continue;
    const label = m[1]!.toLowerCase();
    const n = Number.parseFloat(m[2]!.replace(/%/g, ''));
    if (!Number.isFinite(n)) continue;
    const key = LEAFLY_EFFECT_PCT_KEYS.find(([, L]) => L.toLowerCase() === label)?.[0];
    if (key) out[key] = Math.min(100, Math.max(0, n));
  }
  return Object.keys(out).length > 0 ? out : null;
}
