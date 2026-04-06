import type { JWTPayload } from 'jose';

export type JwtUser = JWTPayload & {
  sub: string;
  email?: string;
  user_metadata?: { display_name?: string };
};

export function preferredProfileDisplayName(payload: JwtUser): string | null {
  const raw = payload.user_metadata?.display_name;
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  return t.length > 0 ? t.slice(0, 120) : null;
}
