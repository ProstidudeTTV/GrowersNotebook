/** Keep in sync with `apps/api/src/communities/community-icon-keys.ts`. */
export const COMMUNITY_ICON_KEYS = [
  "seedling",
  "leaf",
  "sprout",
  "sun",
  "droplet",
  "flame",
  "greenhouse",
  "mountain",
  "beaker",
  "heart",
  "users",
  "home",
] as const;

export type CommunityIconKey = (typeof COMMUNITY_ICON_KEYS)[number];

export const COMMUNITY_ICON_LABELS: Record<CommunityIconKey, string> = {
  seedling: "Seedling",
  leaf: "Leaf",
  sprout: "Sprout",
  sun: "Sun",
  droplet: "Water",
  flame: "Flame",
  greenhouse: "Greenhouse",
  mountain: "Mountain",
  beaker: "Science",
  heart: "Heart",
  users: "Community",
  home: "Home",
};

export function isCommunityIconKey(
  v: string | null | undefined,
): v is CommunityIconKey {
  if (v == null) return false;
  const t = v.trim();
  return (COMMUNITY_ICON_KEYS as readonly string[]).includes(t);
}
