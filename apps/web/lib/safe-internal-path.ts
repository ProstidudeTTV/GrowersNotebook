/**
 * Prevent open redirects from `?next=` (only allow same-site relative paths).
 */
export function safeInternalPath(raw: string | null | undefined): string {
  if (raw == null || raw === "") return "/";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//") || t.includes("://")) {
    return "/";
  }
  return t;
}
