import { type NextRequest, NextResponse } from "next/server";
import { getPublicSiteOrigin } from "@/lib/public-site-origin";
import { safeInternalPath } from "@/lib/safe-internal-path";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

/**
 * PKCE email-confirm / magic-link target.
 * Session cookies are written onto the redirect response — see {@link createSupabaseRouteHandlerClient}.
 */
export async function GET(request: NextRequest) {
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

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const target =
    nextPath !== "/" ? `${origin}${nextPath}` : `${origin}/auth/complete`;

  const response = NextResponse.redirect(target);
  const supabase = createSupabaseRouteHandlerClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  return response;
}
