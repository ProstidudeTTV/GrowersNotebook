import { getPublicApiUrl } from "./public-api-url";

/** Browser: same-origin `/api/gn-proxy/...` (no CORS). Server: direct API URL. */
function resolveClientApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    return `/api/gn-proxy${p}`;
  }
  return `${getPublicApiUrl().replace(/\/+$/, "")}${p}`;
}

/**
 * JSON fetch to the Nest API. In the browser, uses the Next.js gn-proxy route.
 */
export async function clientApiJson<T>(
  path: string,
  init?: { token?: string | null; signal?: AbortSignal },
): Promise<T> {
  const url = resolveClientApiUrl(path);
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (init?.token) {
    headers.set("Authorization", `Bearer ${init.token}`);
  }
  const res = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
    signal: init?.signal,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      text.length > 200 ? `${text.slice(0, 200)}…` : text || res.statusText,
    );
  }
  if (!text.trim()) return undefined as T;
  return JSON.parse(text) as T;
}
