import { BadRequestException } from '@nestjs/common';

/** Remote GIF hosts we allow as inline stickers (not user uploads). */
export function isEmbeddedGifProviderUrl(url: string): boolean {
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
  if (host === 'media.tenor.com' || host === 'c.tenor.com') return true;
  return false;
}

/** One remote GIF sticker per message, and never mixed with uploads. */
export function assertEmbeddedGifAttachmentRules(urls: string[]): void {
  const embed = urls.filter(isEmbeddedGifProviderUrl);
  const other = urls.filter((u) => !isEmbeddedGifProviderUrl(u));
  if (embed.length > 1) {
    throw new BadRequestException(
      'Only one GIF from search can be attached per message.',
    );
  }
  if (embed.length > 0 && other.length > 0) {
    throw new BadRequestException(
      'GIFs cannot be combined with uploaded images or videos.',
    );
  }
}
