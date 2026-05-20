/**
 * Server-side admin client. Talks directly to the Nest API (no gn-proxy hop)
 * so server components and server actions can render lists without a client
 * round-trip.
 */
import "server-only";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getPublicApiUrl } from "@/lib/public-api-url";
import type { AdminRequestInit, AdminResult } from "./client";

function classifyStatus(status: number) {
  if (status === 0) return "network" as const;
  if (status === 401) return "auth" as const;
  if (status === 403) return "forbidden" as const;
  if (status === 404) return "notfound" as const;
  if (status === 400 || status === 409 || status === 422) return "validation" as const;
  if (status === 502 || status === 503 || status === 504) return "proxy" as const;
  if (status >= 500) return "server" as const;
  return "unknown" as const;
}

function extractMessage(status: number, body: unknown): string {
  if (typeof body === "string" && body.trim()) return `${status}: ${body.trim()}`;
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    if (typeof o.message === "string") return `${status}: ${o.message}`;
    if (Array.isArray(o.message)) return `${status}: ${o.message.join("; ")}`;
    if (typeof o.error === "string") return `${status}: ${o.error}`;
    if (typeof o.detail === "string") return `${status}: ${o.detail}`;
  }
  return `${status}: Request failed.`;
}

async function parseBody(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) return await res.json();
    const t = await res.text();
    return t || null;
  } catch {
    return null;
  }
}

async function serverAuthHeader(): Promise<string | null> {
  const supabase = await createServerSupabase();
  let {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const refreshed = await supabase.auth.refreshSession();
    session = refreshed.data.session;
  }
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}

/** Server-side admin fetch (server components, server actions, route handlers). */
export async function adminFetchServer<T = unknown>(
  path: string,
  init: AdminRequestInit = {},
): Promise<AdminResult<T>> {
  let base: string;
  try {
    const root = process.env.INTERNAL_API_URL?.trim() || getPublicApiUrl();
    base = `${root.replace(/\/+$/, "")}/admin`;
  } catch (e) {
    return {
      ok: false,
      status: 0,
      message:
        e instanceof Error
          ? `Web service is missing NEXT_PUBLIC_API_URL: ${e.message}`
          : "Web service is missing NEXT_PUBLIC_API_URL.",
      source: "proxy",
    };
  }

  const auth = await serverAuthHeader();
  const clean = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${clean}`);
  if (init.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (auth) headers.set("Authorization", auth);

  let body: BodyInit | undefined;
  if (init.form) {
    body = init.form;
  } else if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: init.method ?? "GET",
      headers,
      body,
      cache: init.cache ?? "no-store",
      signal: init.signal,
    });
  } catch (e) {
    return {
      ok: false,
      status: 0,
      message: e instanceof Error ? e.message : "Network error",
      source: "network",
    };
  }

  const parsed = await parseBody(res);
  const totalHeader = res.headers.get("x-total-count");

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: extractMessage(res.status, parsed),
      source: classifyStatus(res.status),
      body: parsed,
    };
  }

  return {
    ok: true,
    status: res.status,
    data: parsed as T,
    totalCount: totalHeader ? Number(totalHeader) : null,
  };
}
