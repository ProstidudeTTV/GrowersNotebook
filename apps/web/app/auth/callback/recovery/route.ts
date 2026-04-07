import { type NextRequest, NextResponse } from "next/server";
import { getPublicSiteOrigin } from "@/lib/public-site-origin";
import {
  createSupabaseRouteHandlerClient,
  redirectPreservingCookies,
} from "@/lib/supabase/route-handler";

/**
 * PKCE handler for **password recovery** (explicit `redirectTo` from the app).
 * Cookie jar + redirect copy so all `Set-Cookie` values reach the browser.
 */
export async function GET(request: NextRequest) {
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

  const destination = `${origin}/auth/update-password`;
  const jar = NextResponse.next({ request });

  if (code) {
    const supabase = createSupabaseRouteHandlerClient(request, jar);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }
    return redirectPreservingCookies(jar, destination);
  }

  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");
  if (tokenHash && otpType === "recovery") {
    const supabase = createSupabaseRouteHandlerClient(request, jar);
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }
    return redirectPreservingCookies(jar, destination);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
