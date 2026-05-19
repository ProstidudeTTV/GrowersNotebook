import type { SupabaseClient } from "@supabase/supabase-js";

/** SECURITY DEFINER RPC — safe aggregate for guests and signed-in users. */
export async function fetchGrowersOnlineCount(
  supabase: SupabaseClient,
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("growers_online_count");
    if (error) return 0;
    const value = typeof data === "number" ? data : Number(data);
    return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
  } catch {
    return 0;
  }
}
