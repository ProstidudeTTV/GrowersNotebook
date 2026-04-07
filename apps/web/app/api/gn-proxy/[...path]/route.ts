import type { NextRequest } from "next/server";

/** Same-origin proxy to Nest — browser `apiFetch` targets this to avoid CORS. */
export const dynamic = "force-dynamic";

function upstreamBase(): string | null {
  const base =
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!base) return null;
  return base.replace(/\/+$/, "");
}

async function proxyToApi(req: NextRequest, segments: string[] | undefined) {
  const apiRoot = upstreamBase();
  if (!apiRoot) {
    return Response.json(
      { message: "API URL is not configured on the web service" },
      { status: 503 },
    );
  }
  const subpath = (segments ?? []).join("/");
  const search = req.nextUrl.search;
  const url = subpath
    ? `${apiRoot}/${subpath}${search}`
    : `${apiRoot}/${search}`;

  const headers = new Headers();
  const accept = req.headers.get("accept");
  if (accept) headers.set("Accept", accept);
  else headers.set("Accept", "application/json");
  const auth = req.headers.get("authorization");
  if (auth) headers.set("Authorization", auth);
  const ct = req.headers.get("content-type");
  if (ct) headers.set("Content-Type", ct);

  const method = req.method.toUpperCase();
  let body: ArrayBuffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    body = await req.arrayBuffer();
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body:
        body !== undefined && body.byteLength > 0 ? body : undefined,
      cache: "no-store",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upstream fetch failed";
    return Response.json({ message: msg }, { status: 502 });
  }

  const outBuf = await res.arrayBuffer();
  const out = new Response(outBuf, { status: res.status });
  const outCt = res.headers.get("content-type");
  if (outCt) out.headers.set("Content-Type", outCt);
  const total = res.headers.get("x-total-count");
  if (total) out.headers.set("X-Total-Count", total);
  return out;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await context.params;
  return proxyToApi(req, segments);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await context.params;
  return proxyToApi(req, segments);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await context.params;
  return proxyToApi(req, segments);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await context.params;
  return proxyToApi(req, segments);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await context.params;
  return proxyToApi(req, segments);
}
