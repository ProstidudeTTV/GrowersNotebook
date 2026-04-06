import { NextResponse } from "next/server";
import { getPublicSiteOrigin } from "@/lib/public-site-origin";
import { createClient } from "@/lib/supabase/server";

/**
 * PKCE email-confirm / magic-link target.
 * Supabase → Authentication → URL configuration:
 * - Site URL: your public web origin (e.g. https://growers-notebook-web.onrender.com)
 * - Redirect URLs: same origin + `/auth/callback` (and local dev if needed)
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
      return NextResponse.redirect(`${origin}/auth/complete`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}