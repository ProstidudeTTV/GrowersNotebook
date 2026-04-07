import { type NextRequest, NextResponse } from "next/server";
import {
  PASSWORD_RECOVERY_FLOW_COOKIE,
  PASSWORD_RECOVERY_FLOW_VALUE,
  clearPasswordRecoveryFlowCookie,
} from "@/lib/auth-recovery-cookie";
import { getPublicSiteOrigin } from "@/lib/public-site-origin";
import { safeInternalPath } from "@/lib/safe-internal-path";
import {
  createSupabaseRouteHandlerClient,
  redirectPreservingCookies,
} from "@/lib/supabase/route-handler";
import { sessionIsPasswordRecovery } from "@/lib/supabase/session-flow";

/**
 * PKCE email-confirm / magic-link target. Password recovery often lands here too when
 * the email template uses `{{ .SiteURL }}/auth/callback` — we detect recovery via JWT
 * `amr` and send users to `/auth/update-password` instead of `/auth/complete` → `/`.
 *
 * Uses `NextResponse.next()` as a cookie jar, then redirects with copied cookies so the
 * final `Location` matches the flow (important when recovery URL differs from signup).
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

  const jar = NextResponse.next({ request });
  const supabase = createSupabaseRouteHandlerClient(request, jar);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const typeParam = searchParams.get("type");
  const forgotCookie =
    request.cookies.get(PASSWORD_RECOVERY_FLOW_COOKIE)?.value ===
    PASSWORD_RECOVERY_FLOW_VALUE;
  const recovery =
    typeParam === "recovery" ||
    sessionIsPasswordRecovery(data.session ?? null) ||
    forgotCookie;

  let destination: string;
  if (recovery) {
    destination = `${origin}/auth/update-password`;
  } else if (nextPath !== "/") {
    destination = `${origin}${nextPath}`;
  } else {
    destination = `${origin}/auth/complete`;
  }

  const out = redirectPreservingCookies(jar, destination);
  if (forgotCookie) {
    clearPasswordRecoveryFlowCookie(out);
  }
  return out;
}
