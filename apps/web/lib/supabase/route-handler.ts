import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
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

/**
 * PKCE sets several auth cookies. If the final URL differs from the response used during
 * `exchangeCodeForSession`, copy cookies onto a fresh redirect (see main `/auth/callback`).
 */
export function redirectPreservingCookies(
  source: NextResponse,
  destination: string,
): NextResponse {
  const out = NextResponse.redirect(destination);
  for (const c of source.cookies.getAll()) {
    out.cookies.set(c.name, c.value, {
      domain: c.domain,
      expires: c.expires,
      httpOnly: c.httpOnly,
      maxAge: c.maxAge,
      path: c.path,
      priority: c.priority,
      sameSite: c.sameSite,
      secure: c.secure,
      partitioned: c.partitioned,
    });
  }
  return out;
}
