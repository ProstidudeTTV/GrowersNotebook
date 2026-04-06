import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicKey, getSupabaseUrl } from "./public-env";

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublicKey());
}
