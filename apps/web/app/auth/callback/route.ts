import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PKCE email-confirm / magic-link target. Add this URL (plus production origin)
 * under Supabase → Authentication → URL configuration → Redirect URLs.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
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
