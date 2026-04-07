/** True when env suggests production on Render (for friendlier error copy). */
export function isLikelyHostedRenderDeploy(): boolean {
  const api = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  return api.includes("onrender.com") || site.includes("onrender.com");
}
