import type { JWTPayload } from 'jose';

export type JwtUser = JWTPayload & {
  sub: string;
  email?: string;
  user_metadata?: {
    display_name?: string;
    mailing_list_opt_in?: boolean | string;
  };
};

export function preferredProfileDisplayName(payload: JwtUser): string | null {
  const raw = payload.user_metadata?.display_name;
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  return t.length > 0 ? t.slice(0, 120) : null;
}

/** From signup metadata; only applied when the profile row is first inserted. */
export function mailingListOptInFromJwt(payload: JwtUser): boolean {
  const raw = payload.user_metadata?.mailing_list_opt_in;
  return raw === true || raw === 'true';
}
