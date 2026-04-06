import { ConfigService } from '@nestjs/config';
import {
  createRemoteJWKSet,
  decodeJwt,
  decodeProtectedHeader,
  jwtVerify,
} from 'jose';
import type { JwtUser } from './jwt-user';

function projectAuthJwksUrl(projectUrl: string): URL {
  const base = projectUrl.replace(/\/$/, '');
  return new URL(`${base}/auth/v1/.well-known/jwks.json`);
}

/** Treat token `iss` as canonical so we match GoTrue exactly (trailing slash, path, etc.). */
function assertIssMatchesProject(iss: unknown, projectUrl: string): asserts iss is string {
  if (typeof iss !== 'string' || !iss) {
    throw new Error('JWT missing iss');
  }
  const base = new URL(projectUrl.replace(/\/$/, ''));
  let parsed: URL;
  try {
    parsed = new URL(iss);
  } catch {
    throw new Error('JWT iss is not a valid URL');
  }
  if (parsed.origin !== base.origin) {
    throw new Error('JWT issuer does not match SUPABASE_URL origin');
  }
  if (!parsed.pathname.startsWith('/auth')) {
    throw new Error('JWT issuer must be under /auth');
  }
}

/**
 * Verifies a Supabase Auth access token. Supports legacy HS256 (JWT secret) and
 * asymmetric signing keys (JWKS), per https://supabase.com/docs/guides/auth/jwts
 */
export async function verifySupabaseAccessToken(
  token: string,
  config: ConfigService,
): Promise<JwtUser> {
  let header: ReturnType<typeof decodeProtectedHeader>;
  try {
    header = decodeProtectedHeader(token);
  } catch {
    throw new Error('Malformed JWT');
  }

  const alg = header.alg;
  if (!alg) throw new Error('Missing alg');

  const projectUrl =
    config.get<string>('SUPABASE_URL')?.trim() ||
    config.get<string>('NEXT_PUBLIC_SUPABASE_URL')?.trim();
  const jwtSecret = config.get<string>('SUPABASE_JWT_SECRET')?.trim();

  if (alg === 'HS256') {
    if (!jwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET is not configured');
    }
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
      clockTolerance: '60s',
    });
    return payload as JwtUser;
  }

  if (!projectUrl) {
    throw new Error(
      'SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required for asymmetric JWTs (non-HS256)',
    );
  }

  const unverified = decodeJwt(token);
  assertIssMatchesProject(unverified.iss, projectUrl);

  const JWKS = createRemoteJWKSet(projectAuthJwksUrl(projectUrl));
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: unverified.iss,
    clockTolerance: '60s',
  });

  return payload as JwtUser;
}
