import axios from "axios";
import { createClient } from "@/lib/supabase/client";
import { getPublicApiUrl } from "@/lib/public-api-url";

/** Same-origin path segment for Nest admin routes (browser only; see refine-admin-layout). */
export const ADMIN_PROXY_PATH = "/api/gn-proxy/admin";

export const adminAxios = axios.create();

adminAxios.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    config.baseURL = `${window.location.origin}${ADMIN_PROXY_PATH}`;
  } else {
    config.baseURL = `${getPublicApiUrl().replace(/\/+$/, "")}/admin`;
  }
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
