import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Current access token for Nest (`Authorization: Bearer`).
 *
 * Uses `getSession()` only — do **not** call `refreshSession()` here. Manual refresh
 * races `@supabase/ssr` cookie sync and the client’s `autoRefreshToken`, and can
 * clear or break persistence (sessions disappearing after navigation / reload).
 */
export async function getAccessTokenForApi(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
