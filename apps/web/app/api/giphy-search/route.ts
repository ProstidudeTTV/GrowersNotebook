import type { NextRequest } from "next/server";

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

async function searchOnce(
  apiKey: string,
  query: string,
  limit: number,
): Promise<GiphyItem[]> {
  const upstream = new URL("https://api.giphy.com/v1/gifs/search");
  upstream.searchParams.set("api_key", apiKey);
  upstream.searchParams.set("q", query);
  upstream.searchParams.set("limit", String(limit));
  upstream.searchParams.set("rating", "g");
  upstream.searchParams.set("lang", "en");
  let res: Response;
  try {
    res = await fetch(upstream.toString(), { cache: "no-store" });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  const json = (await res.json()) as GiphySearchResponse;
  const items =
    json.data
      ?.map((d) => toItem(d))
      .filter(Boolean) ?? [];
  return items as GiphyItem[];
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
  /** Dedupe by Giphy id — downsized vs fixed_height URLs differ for the same GIF. */
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
  const key = process.env.GIPHY_API_KEY?.trim();
  if (!key) {
    return Response.json({ items: [] as GiphyItem[] });
  }
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({ items: [] as GiphyItem[] });
  }

  const qTrim = q.trim();
  const queries = fuzzyQueries(qTrim);
  /** One large primary request so short queries still return many GIFs; extras diversify. */
  const primaryQuery = queries[0] ?? qTrim;
  const primaryChunk = await searchOnce(key, primaryQuery, 50);
  const altQueries = queries.filter((sub) => sub !== primaryQuery).slice(0, 5);
  const altChunks = await Promise.all(
    altQueries.map((sub) => searchOnce(key, sub, 16)),
  );
  const items = mergeFuzzyResults([primaryChunk, ...altChunks], 56);
  return Response.json({ items });
}
