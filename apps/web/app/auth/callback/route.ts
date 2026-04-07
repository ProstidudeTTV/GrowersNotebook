import { NextResponse } from "next/server";
import { getPublicSiteOrigin } from "@/lib/public-site-origin";
import { safeInternalPath } from "@/lib/safe-internal-path";
import { createClient } from "@/lib/supabase/server";

/**
 * PKCE email-confirm / magic-link target.
 * Supabase → Authentication → URL configuration:
 * - Site URL: your public web origin (e.g. https://growers-notebook-web.onrender.com)
 * - Redirect URLs: same origin + `/auth/callback` (query strings allowed, e.g.
 *   `…/auth/callback?next=/auth/update-password` for password recovery).
 */
export async function GET(request: Request) {
  const origin = getPublicSiteOrigin(request);
  const { searchParams } = new URL(request.url);
  const nextPath = safeInternalPath(searchParams.get("next"));
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
      if (nextPath !== "/") {
        return NextResponse.redirect(`${origin}${nextPath}`);
      }
      return NextResponse.redirect(`${origin}/auth/complete`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}