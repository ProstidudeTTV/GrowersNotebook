import { getPublicApiUrl } from "./public-api-url";

const base = () => getPublicApiUrl();

function apiBaseHint(apiRoot: string): string {
  return (
    ` Cannot reach API at ${apiRoot}. ` +
    `Ensure the Nest API is running and NEXT_PUBLIC_API_URL in apps/web/.env.local matches it. ` +
    `Open \`${apiRoot}/health\` in a browser — it should return JSON.`
  );
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string | null; timeoutMs?: number | null },
): Promise<T> {
  const apiRoot = base().replace(/\/+$/, "");
  const url = `${apiRoot}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (init?.token) {
    headers.set("Authorization", `Bearer ${init.token}`);
  }
  const { token: _t, timeoutMs, ...rest } = init ?? {};
  void _t;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timeoutCtl: AbortController | undefined;
  const shouldTimeOut =
    timeoutMs != null &&
    timeoutMs > 0 &&
    rest.signal === undefined;
  if (shouldTimeOut) {
    timeoutCtl = new AbortController();
    timer = setTimeout(() => timeoutCtl!.abort(), timeoutMs);
  }
  const signal = rest.signal ?? timeoutCtl?.signal;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      signal,
      headers,
      cache: rest.cache ?? "no-store",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    const hint = e instanceof TypeError ? apiBaseHint(apiRoot) : "";
    throw new Error(`${msg}.${hint}`);
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();

  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get("Location") ?? "";
    throw new Error(
      `API returned redirect ${res.status}${loc ? ` → ${loc}` : ""}. ` +
        `Check NEXT_PUBLIC_API_URL is the Nest API origin (e.g. …-api.onrender.com), not the Next site.`,
    );
  }

  if (!res.ok) {
    const hint = text.trimStart().startsWith("<")
      ? " (response is HTML — check NEXT_PUBLIC_API_URL points at the API, not the Next dev server)"
      : "";
    throw new Error(
      (text.length > 400 ? `${text.slice(0, 400)}…` : text) ||
        `${res.status} ${res.statusText}${hint}`,
    );
  }

  const trimmed = text.trim();
  if (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    trimmed.startsWith("<")
  ) {
    throw new Error(
      `Expected JSON from ${url} but received HTML. ` +
        `Confirm NEXT_PUBLIC_API_URL targets the Nest API port and the API is running.`,
    );
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(
      `Invalid JSON from ${url}: ${trimmed.slice(0, 160)}${trimmed.length > 160 ? "…" : ""}`,
    );
  }
}
