import axios from "axios";

/** Extract a human-readable message from an adminAxios / gn-proxy error.
 *
 * IMPORTANT: We never fabricate a "set SUPABASE_SERVICE_ROLE_KEY" message —
 * the same 503 can come from the gn-proxy (no API URL) or the Nest API (no
 * storage) or upstream Supabase, and guessing makes real errors invisible.
 * Always surface the actual response body.
 */
export function adminApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data;
    if (typeof data === "string" && data.trim()) {
      return status ? `${status}: ${data.trim()}` : data.trim();
    }
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const candidates: unknown[] = [];
      if (typeof obj.message === "string") candidates.push(obj.message);
      else if (Array.isArray(obj.message)) candidates.push(obj.message.join("; "));
      if (typeof obj.error === "string") candidates.push(obj.error);
      if (typeof obj.detail === "string") candidates.push(obj.detail);
      const msg = candidates.find((c): c is string => typeof c === "string" && c.trim().length > 0);
      if (msg) return status ? `${status}: ${msg}` : msg;
    }
    if (status === 503) {
      return "503: Upstream service is unavailable. Open /admin/health for a per-layer diagnostic.";
    }
    if (status === 502) {
      return "502: Web proxy could not reach the API. Open /admin/health.";
    }
    if (status === 403) {
      return "403: Forbidden — your staff role does not allow this action.";
    }
    if (status === 401) {
      return "401: Sign-in expired — refresh the page and sign back in.";
    }
    if (status === 400) {
      return "400: Request rejected (validation). Check required fields.";
    }
    if (err.message) return `${status ?? "?"}: ${err.message}`;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
