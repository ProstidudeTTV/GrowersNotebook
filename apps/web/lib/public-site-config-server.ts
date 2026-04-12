import { cache } from "react";
import { getPublicApiUrl } from "@/lib/public-api-url";
import {
  emptyPublicSiteConfig,
  type PublicSiteConfigPayload,
} from "@/lib/public-site-config";

const REVALIDATE_SEC = 60;

/** One cached fetch per request for metadata + JSON-LD. */
export const getPublicSiteConfigCached = cache(
  async (): Promise<PublicSiteConfigPayload> => {
    const api = getPublicApiUrl().replace(/\/+$/, "");
    try {
      const res = await fetch(`${api}/site/public-config`, {
        next: { revalidate: REVALIDATE_SEC },
      });
      if (!res.ok) return emptyPublicSiteConfig;
      const j = (await res.json()) as Partial<PublicSiteConfigPayload>;
      return {
        ...emptyPublicSiteConfig,
        ...j,
        announcement: j.announcement ?? null,
      };
    } catch {
      return emptyPublicSiteConfig;
    }
  },
);
