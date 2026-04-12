import type { Metadata } from "next";
import type { PublicSiteConfigPayload } from "@/lib/public-site-config";

export const SITE_NAME = "Growers Notebook";

/**
 * Public site origin when `NEXT_PUBLIC_SITE_URL` is unset in production builds.
 * Must match the live hostname; used for auth email `redirectTo` fallbacks and metadata.
 */
export const CANONICAL_PUBLIC_SITE_ORIGIN = "https://growersnotebook.com";

/** Primary SEO focus: home cannabis cultivation community. */
export const SITE_TAGLINE =
  "Community for cannabis home growers — notebooks, tips, strains, nutrients, and conversations with fellow growers.";

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
 * Hard-coded SEO fallbacks when database overrides are empty (admin can compare
 * and optionally copy into saved settings).
 */
export const BUILTIN_SEO_REFERENCE = {
  /** `<title>` for the home page and fallback when a route does not set a title. */
  homeTitle: `${SITE_NAME} — Cannabis home grower community`,
  /** Pattern for most inner pages: first segment comes from the page, suffix from code. */
  innerTitleExample: `Example page · ${SITE_NAME}`,
  metaDescription: SITE_TAGLINE,
  keywordsCommaSeparated: [...SEO_KEYWORDS].join(", "),
} as const;

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

/** Apply admin-managed SEO fields from `site/public-config` over code defaults. */
export function mergeMetadataWithPublicConfig(
  base: Metadata,
  cfg: PublicSiteConfigPayload,
): Metadata {
  const fallbackTitle =
    typeof base.title === "string"
      ? base.title
      : typeof base.title === "object" &&
          base.title !== null &&
          "default" in base.title
        ? String((base.title as { default: string }).default)
        : `${SITE_NAME} — Cannabis home grower community`;
  const fallbackTemplate =
    typeof base.title === "object" &&
    base.title !== null &&
    "template" in base.title
      ? String((base.title as { template: string }).template)
      : `%s · ${SITE_NAME}`;
  const titleDefault = cfg.seoDefaultTitle?.trim() || fallbackTitle;
  const description =
    cfg.seoDefaultDescription?.trim() ||
    (typeof base.description === "string" ? base.description : SITE_TAGLINE);
  const kwParsed = cfg.seoKeywords
    ?.split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const keywords =
    kwParsed && kwParsed.length > 0 ? kwParsed : base.keywords;
  const ogUrl = cfg.ogImageUrl?.trim();
  const hasOg = Boolean(ogUrl?.startsWith("https://"));

  return {
    ...base,
    title: { default: titleDefault, template: fallbackTemplate },
    description,
    ...(keywords ? { keywords } : {}),
    openGraph: {
      ...base.openGraph,
      title: titleDefault,
      description,
      ...(hasOg && ogUrl
        ? {
            images: [
              {
                url: ogUrl,
                width: 1200,
                height: 630,
                alt: titleDefault,
              },
            ],
          }
        : {}),
    },
    twitter: {
      ...base.twitter,
      title: titleDefault,
      description,
      ...(hasOg && ogUrl ? { images: [ogUrl] } : {}),
    },
  };
}

export function canonicalPath(path: string): string {
  const base = getSiteUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
