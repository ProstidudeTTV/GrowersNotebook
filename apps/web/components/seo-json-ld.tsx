import { getPublicSiteConfigCached } from "@/lib/public-site-config-server";
import { SITE_NAME, SITE_TAGLINE, getSiteUrl } from "@/lib/site-config";

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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
