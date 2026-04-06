import axios from "axios";
import { createClient } from "@/lib/supabase/client";
import { getPublicApiUrl } from "@/lib/public-api-url";

export const adminAxios = axios.create({
  baseURL: `${getPublicApiUrl()}/admin`,
});

adminAxios.interceptors.request.use(async (config) => {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
