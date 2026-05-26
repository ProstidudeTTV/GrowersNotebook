/**
 * Typed admin HTTP client (browser + server).
 *
 * One source of truth that every admin page should use for new code. Replaces
 * the ad-hoc mix of Refine `simple-rest`, `adminAxios`, and `apiFetch` calls
 * that swallowed errors. Never throws — always returns a discriminated union
 * so call sites must handle the error case visibly.
 */
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";

export type AdminOk<T> = {
  ok: true;
  status: number;
  data: T;
  totalCount: number | null;
};

export type AdminErr = {
  ok: false;
  status: number;
  message: string;
  /** Where the error originated, helps the user fix the right service. */
  source: "network" | "proxy" | "auth" | "validation" | "forbidden" | "notfound" | "server" | "unknown";
  body?: unknown;
};

export type AdminResult<T> = AdminOk<T> | AdminErr;

export type AdminRequestInit = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** JSON body — will be stringified and sent with Content-Type: application/json. */
  json?: unknown;
  /** Pre-built FormData — sent as-is (multipart). */
  form?: FormData;
  /** Query string params. */
  query?: Record<string, string | number | undefined | null>;
  /** Cache mode. Defaults to no-store. */
  cache?: RequestCache;
  signal?: AbortSignal;
};

const ADMIN_PROXY_PATH = "/api/gn-admin";

function buildUrl(base: string, path: string, query: AdminRequestInit["query"]): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${clean}`, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  if (base.startsWith("/")) {
    return `${url.pathname}${url.search}`;
  }
  return url.toString();
}

function classifyStatus(status: number): AdminErr["source"] {
  if (status === 0) return "network";
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 404) return "notfound";
  if (status === 400 || status === 409 || status === 422) return "validation";
  if (status === 502 || status === 503 || status === 504) return "proxy";
  if (status >= 500) return "server";
  return "unknown";
}

function extractMessage(status: number, body: unknown): string {
  if (typeof body === "string" && body.trim()) {
    return `${status}: ${body.trim()}`;
  }
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    if (typeof o.message === "string") return `${status}: ${o.message}`;
    if (Array.isArray(o.message)) return `${status}: ${o.message.join("; ")}`;
    if (typeof o.error === "string") return `${status}: ${o.error}`;
    if (typeof o.detail === "string") return `${status}: ${o.detail}`;
  }
  switch (status) {
    case 401:
      return "401: Sign-in expired. Refresh and sign back in.";
    case 403:
      return "403: Your role does not allow this action.";
    case 404:
      return "404: Not found.";
    case 502:
      return "502: Web proxy could not reach the API.";
    case 503:
      return "503: Upstream unavailable. Open /admin/health.";
    case 504:
      return "504: Upstream timed out.";
    default:
      return `${status}: Request failed.`;
  }
}

async function parseResponseBody(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      return await res.json();
    }
    const t = await res.text();
    return t || null;
  } catch {
    return null;
  }
}

async function fetchAdmin<T>(
  base: string,
  path: string,
  init: AdminRequestInit,
  authHeader: string | null,
): Promise<AdminResult<T>> {
  const url = buildUrl(base, path, init.query);
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (authHeader) headers.set("Authorization", authHeader);

  let body: BodyInit | undefined;
  if (init.form) {
    body = init.form;
  } else if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      headers,
      body,
      cache: init.cache ?? "no-store",
      signal: init.signal,
      credentials: "same-origin",
    });
  } catch (e) {
    return {
      ok: false,
      status: 0,
      message: e instanceof Error ? e.message : "Network error",
      source: "network",
    };
  }

  const parsed = await parseResponseBody(res);
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

/* ------------------------------------------------------------------ */
/* Browser variant — uses Supabase session for auth, gn-proxy for URL  */
/* ------------------------------------------------------------------ */

async function browserAuthHeader(): Promise<string | null> {
  const supabase = createBrowserSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? `Bearer ${token}` : null;
}

export async function adminFetch<T = unknown>(
  path: string,
  init: AdminRequestInit = {},
): Promise<AdminResult<T>> {
  if (typeof window === "undefined") {
    throw new Error("adminFetch is browser-only; use adminFetchServer on the server.");
  }
  const auth = await browserAuthHeader();
  return fetchAdmin<T>(ADMIN_PROXY_PATH, path, init, auth);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

export function isAdminOk<T>(r: AdminResult<T>): r is AdminOk<T> {
  return r.ok;
}

/** Quick helper: assert ok or throw with the parsed message (for use in
 * server actions that prefer try/catch). */
export function unwrapAdmin<T>(r: AdminResult<T>): T {
  if (!r.ok) {
    const err = new Error(r.message) as Error & { status: number; source: string };
    err.status = r.status;
    err.source = r.source;
    throw err;
  }
  return r.data;
}
