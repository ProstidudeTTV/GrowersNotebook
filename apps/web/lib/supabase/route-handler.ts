import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicKey, getSupabaseUrl } from "./public-env";

/**
 * Supabase client for App Router **Route Handlers** only. Cookie writes must go on the
 * same `NextResponse` you return (especially with `redirect()`), otherwise the session
 * from `exchangeCodeForSession` never reaches the browser and the user looks logged out.
 */
export function createSupabaseRouteHandlerClient(
  request: NextRequest,
  response: NextResponse,
) {
  return createServerClient(getSupabaseUrl(), getSupabasePublicKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}
