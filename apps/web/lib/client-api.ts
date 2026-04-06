import { getPublicApiUrl } from "./public-api-url";

/**
 * Browser-side JSON fetch to the Nest API (uses NEXT_PUBLIC_API_URL).
 */
export async function clientApiJson<T>(
  path: string,
  init?: { token?: string | null; signal?: AbortSignal },
): Promise<T> {
  const apiRoot = getPublicApiUrl();
  const url = `${apiRoot}${path.startsWith("/") ? path : `/${path}`}`;
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
