/** Client fetch for `/api/giphy-search` (fuzzy multi-query on server). */
export async function fetchGiphySearchItems(q: string) {
  const r = await fetch(`/api/giphy-search?q=${encodeURIComponent(q)}`, {
    cache: "no-store",
  });
  const j = (await r.json()) as {
    items?: { id?: string; url: string; preview: string; title: string }[];
  };
  return j.items ?? [];
}
