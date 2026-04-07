/** Curated icons (admin pick one per community; web maps to SVG). */
export const COMMUNITY_ICON_KEYS = [
  'seedling',
  'leaf',
  'sprout',
  'sun',
  'droplet',
  'flame',
  'greenhouse',
  'mountain',
  'beaker',
  'heart',
  'users',
  'home',
] as const;

export type CommunityIconKey = (typeof COMMUNITY_ICON_KEYS)[number];

export const COMMUNITY_ICON_KEY_SET = new Set<string>(COMMUNITY_ICON_KEYS);

export function assertCommunityIconKey(
  v: string | null | undefined,
): CommunityIconKey | null {
  if (v == null || v === '') return null;
  const t = v.trim();
  if (COMMUNITY_ICON_KEY_SET.has(t)) return t as CommunityIconKey;
  return null;
}
