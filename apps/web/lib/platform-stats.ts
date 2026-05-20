import { getPublicApiUrl } from "@/lib/public-api-url";

export type PlatformStats = {
  postCount: number;
  growerCount: number;
};

export async function fetchPlatformStats(): Promise<PlatformStats> {
  let base: string;
  try {
    base = getPublicApiUrl();
  } catch {
    base =
      process.env.API_URL?.trim().replace(/\/+$/, "") ?? "http://localhost:3001";
  }
  try {
    const res = await fetch(`${base}/site/platform-stats`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { postCount: 0, growerCount: 0 };
    const data = (await res.json()) as Partial<PlatformStats>;
    return {
      postCount:
        typeof data.postCount === "number" && data.postCount >= 0
          ? Math.trunc(data.postCount)
          : 0,
      growerCount:
        typeof data.growerCount === "number" && data.growerCount >= 0
          ? Math.trunc(data.growerCount)
          : 0,
    };
  } catch {
    return { postCount: 0, growerCount: 0 };
  }
}
