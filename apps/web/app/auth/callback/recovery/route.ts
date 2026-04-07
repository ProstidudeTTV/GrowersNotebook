import { NextResponse } from "next/server";
import { getPublicSiteOrigin } from "@/lib/public-site-origin";
import { createClient } from "@/lib/supabase/server";

/**
 * PKCE handler for **password recovery** only.
 *
 * `redirectTo` cannot be `/auth/callback?next=/auth/update-password`: Supabase appends
 * `?code=` to the configured URL and drops prior query params, so `next` is lost and
 * users were sent to `/auth/complete` → home. This route has no extra query string to lose.
 */
export async function GET(request: Request) {
  const origin = getPublicSiteOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const err = searchParams.get("error");
  const errDesc = searchParams.get("error_description");

  if (err) {
    const q = new URLSearchParams();
    q.set("error", errDesc ?? err);
    return NextResponse.redirect(`${origin}/login?${q.toString()}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/auth/update-password`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
