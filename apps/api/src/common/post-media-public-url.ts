import { ConfigService } from '@nestjs/config';

/** Only our Supabase `post-media` public URLs (same upload path as posts and DMs). */
export function isAllowedPostMediaPublicUrl(
  config: ConfigService,
  url: string,
): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;

  const host = parsed.hostname.toLowerCase();
  if (
    host === 'media.giphy.com' ||
    host === 'i.giphy.com' ||
    host.endsWith('.giphy.com')
  ) {
    return /^\/media\/[a-z0-9]+/i.test(parsed.pathname);
  }
  if (host === 'media.tenor.com' || host === 'c.tenor.com') {
    return true;
  }

  const pathNeedle = '/storage/v1/object/public/post-media/';
  if (!parsed.pathname.startsWith(pathNeedle)) return false;

  const origins = new Set<string>();
  for (const key of ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'] as const) {
    const raw = config.get<string>(key)?.trim().replace(/\/+$/, '');
    if (!raw) continue;
    try {
      origins.add(new URL(raw).origin);
    } catch {
      continue;
    }
  }
  if (origins.size === 0) return false;
  return origins.has(parsed.origin);
}

const AVATAR_PATH = '/storage/v1/object/public/avatars/';

/** Profile avatars: our Supabase `avatars` bucket or embedded GIF hosts (same as post-media). */
export function isAllowedAvatarPublicUrl(
  config: ConfigService,
  url: string,
): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;

  const host = parsed.hostname.toLowerCase();
  if (
    host === 'media.giphy.com' ||
    host === 'i.giphy.com' ||
    host.endsWith('.giphy.com')
  ) {
    return /^\/media\/[a-z0-9]+/i.test(parsed.pathname);
  }
  if (host === 'media.tenor.com' || host === 'c.tenor.com') {
    return true;
  }

  if (!parsed.pathname.startsWith(AVATAR_PATH)) return false;

  const origins = new Set<string>();
  for (const key of ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'] as const) {
    const raw = config.get<string>(key)?.trim().replace(/\/+$/, '');
    if (!raw) continue;
    try {
      origins.add(new URL(raw).origin);
    } catch {
      continue;
    }
  }
  if (origins.size === 0) return false;
  return origins.has(parsed.origin);
}
