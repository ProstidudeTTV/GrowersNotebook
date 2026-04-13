import { cache } from "react";
import { getPublicApiUrl } from "@/lib/public-api-url";
import {
  emptyPublicSiteConfig,
  type PublicSiteConfigPayload,
} from "@/lib/public-site-config";

/** One cached fetch per request for metadata + JSON-LD (no Data Cache — admin SEO must apply immediately). */
export const getPublicSiteConfigCached = cache(
  async (): Promise<PublicSiteConfigPayload> => {
    const api = getPublicApiUrl().replace(/\/+$/, "");
    try {
      const res = await fetch(`${api}/site/public-config`, { cache: "no-store" });
      if (!res.ok) return emptyPublicSiteConfig;
      const j = (await res.json()) as Partial<PublicSiteConfigPayload>;
      return {
        ...emptyPublicSiteConfig,
        ...j,
        announcement: j.announcement ?? null,
        mailingListNudgeRecommended: Boolean(j.mailingListNudgeRecommended),
      };
    } catch {
      return emptyPublicSiteConfig;
    }
  },
);
