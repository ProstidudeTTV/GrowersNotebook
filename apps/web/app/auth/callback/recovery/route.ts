import { type NextRequest, NextResponse } from "next/server";
import { getPublicSiteOrigin } from "@/lib/public-site-origin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

/**
 * PKCE handler for **password recovery** only.
 *
 * Cookie handling: `createClient()` from `@/lib/supabase/server` uses `cookies()` alone;
 * in Route Handlers, those sets are not reliably applied to `NextResponse.redirect()`.
 * Session cookies must be attached via {@link createSupabaseRouteHandlerClient}.
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

  const redirectOnSuccess = NextResponse.redirect(
    `${origin}/auth/update-password`,
  );

  if (code) {
    const supabase = createSupabaseRouteHandlerClient(
      request,
      redirectOnSuccess,
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }
    return redirectOnSuccess;
  }

  /** Some email templates use `token_hash` + `type=recovery` instead of PKCE `code`. */
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");
  if (tokenHash && otpType === "recovery") {
    const supabase = createSupabaseRouteHandlerClient(
      request,
      redirectOnSuccess,
    );
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }
    return redirectOnSuccess;
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
