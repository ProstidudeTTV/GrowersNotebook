export const RECENT_COMMUNITIES_EVENT = "gn-recent-communities";

export const RECENT_COMMUNITIES_STORAGE_KEY = "gn-recent-communities";

const STORAGE_KEY = RECENT_COMMUNITIES_STORAGE_KEY;
const MAX_ITEMS = 12;

export type RecentCommunity = {
  slug: string;
  name: string;
  visitedAt: number;
};

function parseList(raw: string | null): RecentCommunity[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .map((row): RecentCommunity | null => {
        if (!row || typeof row !== "object") return null;
        const r = row as Record<string, unknown>;
        const slug = typeof r.slug === "string" ? r.slug : "";
        const name = typeof r.name === "string" ? r.name : "";
        const visitedAt = typeof r.visitedAt === "number" ? r.visitedAt : 0;
        if (!slug.trim()) return null;
        return {
          slug: slug.trim(),
          name: name.trim() || slug.trim(),
          visitedAt,
        };
      })
      .filter((x): x is RecentCommunity => x != null);
  } catch {
    return [];
  }
}

export function getRecentCommunities(): RecentCommunity[] {
  if (typeof window === "undefined") return [];
  return parseList(window.localStorage.getItem(STORAGE_KEY))
    .filter((x) => x.slug.length > 0)
    .sort((a, b) => b.visitedAt - a.visitedAt)
    .slice(0, MAX_ITEMS);
}

export function recordRecentCommunityVisit(slug: string, name: string) {
  if (typeof window === "undefined") return;
  const s = slug.trim();
  if (!s) return;
  const label = name.trim() || s;
  let list = parseList(window.localStorage.getItem(STORAGE_KEY));
  list = list.filter((x) => x.slug !== s);
  list.unshift({
    slug: s,
    name: label,
    visitedAt: Date.now(),
  });
  list = list.slice(0, MAX_ITEMS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(RECENT_COMMUNITIES_EVENT));
  } catch {
    /* quota / private mode */
  }
}
