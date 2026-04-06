import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-config";

type HotWeekJson = { items: Array<{ id: string }> };
type CommunityRow = { slug: string; updatedAt?: string };
type CatalogListJson = { items: Array<{ slug: string }> };

async function collectCatalogPaths(
  api: string,
  path: string,
): Promise<string[]> {
  const slugs: string[] = [];
  let page = 1;
  for (;;) {
    try {
      const res = await fetch(
        `${api}${path}?page=${page}&pageSize=100&sort=name`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) break;
      const j = (await res.json()) as CatalogListJson;
      const items = j.items ?? [];
      for (const it of items) {
        if (it.slug) slugs.push(it.slug);
      }
      if (items.length < 100) break;
      page += 1;
      if (page > 200) break;
    } catch {
      break;
    }
  }
  return slugs;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const api = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    {
      url: `${base}/hot`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/following`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/new-post`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/messages`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${base}/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/strains`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: `${base}/breeders`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.75,
    },
  ];

  const out: MetadataRoute.Sitemap = [...staticRoutes];

  if (api) {
    try {
      const hot = await fetch(`${api}/posts/hot/week?page=1&pageSize=50`, {
        next: { revalidate: 3600 },
      });
      if (hot.ok) {
        const j = (await hot.json()) as HotWeekJson;
        for (const item of j.items ?? []) {
          out.push({
            url: `${base}/p/${item.id}`,
            changeFrequency: "weekly" as const,
            priority: 0.85,
          });
        }
      }
    } catch {
      /* ignore */
    }

    try {
      const comm = await fetch(`${api}/communities`, {
        next: { revalidate: 3600 },
      });
      if (comm.ok) {
        const rows = (await comm.json()) as CommunityRow[];
        for (const c of rows ?? []) {
          if (!c.slug) continue;
          out.push({
            url: `${base}/community/${encodeURIComponent(c.slug)}`,
            changeFrequency: "daily" as const,
            priority: 0.85,
          });
        }
      }
    } catch {
      /* ignore */
    }

    try {
      const strainSlugs = await collectCatalogPaths(api, "/strains");
      for (const slug of strainSlugs) {
        out.push({
          url: `${base}/strains/${encodeURIComponent(slug)}`,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        });
      }
    } catch {
      /* ignore */
    }

    try {
      const breederSlugs = await collectCatalogPaths(api, "/breeders");
      for (const slug of breederSlugs) {
        out.push({
          url: `${base}/breeders/${encodeURIComponent(slug)}`,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        });
      }
    } catch {
      /* ignore */
    }
  }

  return out;
}
