import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type GiphySearchResponse = {
  data?: Array<{
    title?: string;
    images?: {
      downsized?: { url?: string };
      fixed_height?: { url?: string };
    };
  }>;
};

export async function GET(req: NextRequest) {
  const key = process.env.GIPHY_API_KEY?.trim();
  if (!key) {
    return Response.json({
      items: [] as { url: string; preview: string; title: string }[],
    });
  }
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({
      items: [] as { url: string; preview: string; title: string }[],
    });
  }
  const upstream = new URL("https://api.giphy.com/v1/gifs/search");
  upstream.searchParams.set("api_key", key);
  upstream.searchParams.set("q", q);
  upstream.searchParams.set("limit", "12");
  upstream.searchParams.set("rating", "g");
  let res: Response;
  try {
    res = await fetch(upstream.toString(), { cache: "no-store" });
  } catch {
    return Response.json({
      items: [] as { url: string; preview: string; title: string }[],
    });
  }
  if (!res.ok) {
    return Response.json({
      items: [] as { url: string; preview: string; title: string }[],
    });
  }
  const json = (await res.json()) as GiphySearchResponse;
  const items =
    json.data
      ?.map((d) => {
        const url =
          d.images?.downsized?.url?.trim() ||
          d.images?.fixed_height?.url?.trim() ||
          "";
        const preview = d.images?.fixed_height?.url?.trim() || url;
        if (!url.startsWith("https://")) return null;
        return {
          url,
          preview: preview.startsWith("https://") ? preview : url,
          title: d.title?.trim() || "GIF",
        };
      })
      .filter(Boolean) ?? [];
  return Response.json({
    items: items as { url: string; preview: string; title: string }[],
  });
}
