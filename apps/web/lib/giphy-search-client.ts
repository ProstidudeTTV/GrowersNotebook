export type GiphySearchResult = {
  items: { id?: string; url: string; preview: string; title: string }[];
  configured?: boolean;
  mode?: string;
  totalCount?: number | null;
};

async function fetchGiphyApi(params: URLSearchParams): Promise<GiphySearchResult> {
  const r = await fetch(`/api/giphy-search?${params.toString()}`, {
    cache: "no-store",
  });
  const j = (await r.json()) as GiphySearchResult & {
    items?: { id?: string; url: string; preview: string; title: string }[];
  };
  return {
    items: j.items ?? [],
    configured: j.configured,
    mode: j.mode,
    totalCount: j.totalCount,
  };
}

/** Trending grid when picker opens (Messenger-style). */
export async function fetchGiphyTrendingItems(options?: {
  offset?: number;
  limit?: number;
}) {
  const params = new URLSearchParams({ mode: "trending" });
  if (options?.offset != null) params.set("offset", String(options.offset));
  if (options?.limit != null) params.set("limit", String(options.limit));
  return fetchGiphyApi(params);
}

/** Search with optional pagination offset. */
export async function fetchGiphySearchItems(
  q: string,
  options?: { offset?: number; limit?: number },
) {
  const trimmed = q.trim();
  if (trimmed.length < 2) {
    return fetchGiphyTrendingItems(options);
  }
  const params = new URLSearchParams({ q: trimmed });
  if (options?.offset != null) params.set("offset", String(options.offset));
  if (options?.limit != null) params.set("limit", String(options.limit));
  return fetchGiphyApi(params);
}
