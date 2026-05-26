import { getPublicSiteConfigCached } from "@/lib/public-site-config-server";
import { SITE_NAME, SITE_TAGLINE, getSiteUrl } from "@/lib/site-config";

function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/** Organization + WebSite structured data for rich results. */
export async function SeoJsonLd() {
  const url = getSiteUrl();
  const cfg = await getPublicSiteConfigCached();
  const description =
    cfg.seoDefaultDescription?.trim() || SITE_TAGLINE;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        name: SITE_NAME,
        url,
        description,
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        name: SITE_NAME,
        url,
        description,
        publisher: { "@id": `${url}/#organization` },
        inLanguage: "en-US",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}

/** Article structured data for post / catalog detail pages. */
export function ArticleJsonLd({
  headline,
  description,
  url,
  imageUrl,
  datePublished,
}: {
  headline: string;
  description?: string;
  url: string;
  imageUrl?: string | null;
  datePublished?: string;
}) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    url,
    ...(description ? { description } : {}),
    ...(datePublished ? { datePublished } : {}),
    ...(imageUrl ? { image: [imageUrl] } : {}),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}
