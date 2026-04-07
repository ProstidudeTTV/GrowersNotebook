import type { Metadata } from "next";

export const SITE_NAME = "Growers Notebook";

/**
 * Public site origin when `NEXT_PUBLIC_SITE_URL` is unset in production builds.
 * Must match the live hostname; used for auth email `redirectTo` fallbacks and metadata.
 */
export const CANONICAL_PUBLIC_SITE_ORIGIN = "https://growersnotebook.com";

/** Primary SEO focus: home cannabis cultivation community. */
export const SITE_TAGLINE =
  "Community for cannabis home growers — grow diaries, tips, strains, nutrients, and conversations with fellow growers.";

export const SEO_KEYWORDS = [
  "cannabis home grow",
  "home grower",
  "marijuana growing",
  "weed growing tips",
  "indoor cannabis",
  "outdoor cannabis grow",
  "grow journal",
  "cannabis community",
  "home cultivation",
  "growers forum",
] as const;

/**
 * Canonical site origin (no trailing slash). Used for metadataBase, sitemap, JSON-LD.
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (process.env.VERCEL_URL?.trim())
    return `https://${process.env.VERCEL_URL.trim()}`;
  if (process.env.RENDER_EXTERNAL_URL?.trim()) {
    return process.env.RENDER_EXTERNAL_URL.trim().replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    return CANONICAL_PUBLIC_SITE_ORIGIN;
  }
  return "http://127.0.0.1:3000";
}

export function defaultSiteMetadata(): Metadata {
  const base = getSiteUrl();
  const description = SITE_TAGLINE;
  const title = {
    default: `${SITE_NAME} — Cannabis home grower community`,
    template: `%s · ${SITE_NAME}`,
  };
  return {
    metadataBase: new URL(`${base}/`),
    title,
    description,
    keywords: [...SEO_KEYWORDS],
    authors: [{ name: SITE_NAME, url: base }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "gardening",
    openGraph: {
      type: "website",
      locale: "en_US",
      url: base,
      siteName: SITE_NAME,
      title: title.default,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: title.default,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? {
          google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        }
      : undefined,
  };
}

export function canonicalPath(path: string): string {
  const base = getSiteUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
