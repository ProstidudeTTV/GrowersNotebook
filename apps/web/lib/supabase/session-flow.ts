import type { Session } from "@supabase/supabase-js";

/** Decode JWT payload (no verification — claim inspection only). */
function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  const first = jwt.indexOf(".");
  const second = jwt.indexOf(".", first + 1);
  if (first === -1 || second === -1) return null;
  const segment = jwt.slice(first + 1, second);
  try {
    const padded =
      segment.replace(/-/g, "+").replace(/_/g, "/") +
      "===".slice((segment.length + 3) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * After PKCE `exchangeCodeForSession`, recovery sessions carry `amr` entries with
 * method `recovery` so we can send users to `/auth/update-password` even when
 * the email link pointed at `/auth/callback` (not `/auth/callback/recovery`).
 */
export function sessionIsPasswordRecovery(session: Session | null): boolean {
  if (!session?.access_token) return false;
  const payload = decodeJwtPayload(session.access_token);
  if (!payload) return false;
  const amr = payload.amr;
  if (!Array.isArray(amr)) return false;
  const stack: unknown[] = [...amr];
  while (stack.length) {
    const item = stack.pop();
    if (item === "recovery") return true;
    if (Array.isArray(item)) {
      stack.push(...item);
      continue;
    }
    if (
      typeof item === "object" &&
      item !== null &&
      "method" in item &&
      typeof (item as { method: unknown }).method === "string" &&
      (item as { method: string }).method === "recovery"
    ) {
      return true;
    }
  }
  return false;
}
