/**
 * Use the **anon** JWT first when both are set. The `sb_publishable_*` key is for newer
 * Data API flows; `createBrowserClient` / Auth (`/auth/v1`), session refresh, and Realtime
 * commonly expect the legacy anon JWT — publishable-first can produce 401 on auth calls.
 * Values: Supabase Dashboard → API, or MCP `get_publishable_keys` (includes legacy anon).
 */
export function getSupabasePublicKey(): string {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const key = anon || publishable;
  if (!key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  return key;
}

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL");
  /** Trailing slashes break REST/auth route join inside @supabase/ssr */
  return url.replace(/\/+$/, "");
}
