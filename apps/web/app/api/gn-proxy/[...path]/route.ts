import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Same-origin proxy to the Nest API for browser requests (avoids CORS).
 * Forwards GET to NEXT_PUBLIC_API_URL (or INTERNAL_API_URL if set server-side only).
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await context.params;
  const subpath = (segments ?? []).join("/");
  const base =
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!base) {
    return Response.json(
      { message: "API URL is not configured on the web service" },
      { status: 503 },
    );
  }
  const apiRoot = base.replace(/\/+$/, "");
  const search = req.nextUrl.search;
  const url = subpath ? `${apiRoot}/${subpath}${search}` : `${apiRoot}/${search}`;

  const headers = new Headers();
  const accept = req.headers.get("accept");
  if (accept) headers.set("Accept", accept);
  else headers.set("Accept", "application/json");
  const auth = req.headers.get("authorization");
  if (auth) headers.set("Authorization", auth);

  let res: Response;
  try {
    res = await fetch(url, { headers, cache: "no-store" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upstream fetch failed";
    return Response.json({ message: msg }, { status: 502 });
  }

  const body = await res.arrayBuffer();
  const out = new Response(body, { status: res.status });
  const ct = res.headers.get("content-type");
  if (ct) out.headers.set("Content-Type", ct);
  return out;
}
