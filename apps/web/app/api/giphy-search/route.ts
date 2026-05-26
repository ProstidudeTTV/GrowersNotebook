import type { NextRequest } from "next/server";
import { getClientIp, takeRateLimit } from "@/lib/server-rate-limit";

export const dynamic = "force-dynamic";

type GiphySearchResponse = {
  data?: Array<{
    id?: string;
    title?: string;
    images?: {
      downsized?: { url?: string };
      fixed_height?: { url?: string };
    };
  }>;
  pagination?: { total_count?: number; count?: number; offset?: number };
};

type GiphyItem = { id: string; url: string; preview: string; title: string };

function toItem(d: NonNullable<GiphySearchResponse["data"]>[number]): GiphyItem | null {
  const id = d.id?.trim();
  const url =
    d.images?.downsized?.url?.trim() ||
    d.images?.fixed_height?.url?.trim() ||
    "";
  const preview = d.images?.fixed_height?.url?.trim() || url;
  if (!url.startsWith("https://")) return null;
  return {
    id: id && id.length > 0 ? id : url,
    url,
    preview: preview.startsWith("https://") ? preview : url,
    title: d.title?.trim() || "GIF",
  };
}

async function fetchGiphy(
  apiKey: string,
  path: "search" | "trending",
  params: { q?: string; limit: number; offset: number },
): Promise<{ items: GiphyItem[]; totalCount: number | null }> {
  const upstream = new URL(
    path === "trending"
      ? "https://api.giphy.com/v1/gifs/trending"
      : "https://api.giphy.com/v1/gifs/search",
  );
  upstream.searchParams.set("api_key", apiKey);
  upstream.searchParams.set("limit", String(params.limit));
  upstream.searchParams.set("offset", String(params.offset));
  upstream.searchParams.set("rating", "g");
  if (path === "search" && params.q) {
    upstream.searchParams.set("q", params.q);
    upstream.searchParams.set("lang", "en");
  }
  let res: Response;
  try {
    res = await fetch(upstream.toString(), { cache: "no-store" });
  } catch {
    return { items: [], totalCount: null };
  }
  if (!res.ok) return { items: [], totalCount: null };
  const json = (await res.json()) as GiphySearchResponse;
  const items =
    json.data
      ?.map((d) => toItem(d))
      .filter(Boolean) ?? [];
  const totalCount =
    typeof json.pagination?.total_count === "number"
      ? json.pagination.total_count
      : null;
  return { items: items as GiphyItem[], totalCount };
}

async function searchOnce(
  apiKey: string,
  query: string,
  limit: number,
  offset = 0,
): Promise<GiphyItem[]> {
  const { items } = await fetchGiphy(apiKey, "search", {
    q: query,
    limit,
    offset,
  });
  return items;
}

/** Broader matching: full phrase + significant words, deduped by GIF id. */
function fuzzyQueries(raw: string): string[] {
  const q = raw.trim();
  if (q.length < 2) return [];
  const words = q
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2)
    .filter((w) => !/^(a|an|the|to|of|in|on|for|and|or|is|it|at|be)$/i.test(w));
  const uniq = [...new Set([q, ...words])];
  return uniq.slice(0, 6);
}

function mergeFuzzyResults(chunks: GiphyItem[][], cap: number): GiphyItem[] {
  const seen = new Set<string>();
  const out: GiphyItem[] = [];
  let round = 0;
  while (out.length < cap) {
    let added = false;
    for (const chunk of chunks) {
      const item = chunk[round];
      if (!item) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
      added = true;
      if (out.length >= cap) break;
    }
    if (!added) break;
    round++;
  }
  return out;
}

export async function GET(req: NextRequest) {
  const rateLimit = takeRateLimit({
    bucket: "giphy-search",
    key: getClientIp(req),
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return Response.json(
      { items: [] as GiphyItem[], configured: true, error: "Too many GIF searches" },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSec),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  const key = process.env.GIPHY_API_KEY?.trim();
  if (!key) {
    return Response.json(
      {
        items: [] as GiphyItem[],
        configured: false,
        totalCount: null,
      },
      { headers: { "X-RateLimit-Remaining": String(rateLimit.remaining) } },
    );
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const mode = req.nextUrl.searchParams.get("mode")?.trim() ?? "";
  const offset = Math.max(
    0,
    Number(req.nextUrl.searchParams.get("offset") ?? 0) || 0,
  );
  const limit = Math.min(
    50,
    Math.max(8, Number(req.nextUrl.searchParams.get("limit") ?? 24) || 24),
  );

  if (q.length < 2 || mode === "trending") {
    const { items, totalCount } = await fetchGiphy(key, "trending", {
      limit,
      offset,
    });
    return Response.json(
      {
        items,
        configured: true,
        mode: "trending",
        totalCount,
        offset,
        limit,
      },
      { headers: { "X-RateLimit-Remaining": String(rateLimit.remaining) } },
    );
  }

  const qTrim = q.trim();
  const queries = fuzzyQueries(qTrim);
  const primaryQuery = queries[0] ?? qTrim;
  const primaryChunk = await searchOnce(key, primaryQuery, 50, offset);
  const altQueries = queries.filter((sub) => sub !== primaryQuery).slice(0, 5);
  const altChunks = await Promise.all(
    altQueries.map((sub) => searchOnce(key, sub, 16, 0)),
  );
  const items = mergeFuzzyResults([primaryChunk, ...altChunks], 56);
  return Response.json(
    {
      items,
      configured: true,
      mode: "search",
      offset,
      limit,
    },
    { headers: { "X-RateLimit-Remaining": String(rateLimit.remaining) } },
  );
}
