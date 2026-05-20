import axios from "axios";

/** Extract a human-readable message from an adminAxios / gn-proxy error. */
export function adminApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data;
    if (typeof data === "string" && data.trim()) {
      return status ? `${status}: ${data.trim()}` : data.trim();
    }
    if (data && typeof data === "object") {
      const msg =
        "message" in data && typeof data.message === "string"
          ? data.message
          : "error" in data && typeof data.error === "string"
            ? data.error
            : null;
      if (msg) return status ? `${status}: ${msg}` : msg;
    }
    if (status === 503) {
      return "503: API storage is not configured (set SUPABASE_SERVICE_ROLE_KEY on growers-notebook-api).";
    }
    if (status === 403) {
      return "403: Forbidden — your staff role may not allow this action.";
    }
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
