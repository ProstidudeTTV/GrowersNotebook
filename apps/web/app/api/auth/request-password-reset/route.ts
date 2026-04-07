import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthRedirectOriginServer } from "@/lib/auth-redirect-origin";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/public-env";

/**
 * Server-side password reset so `redirectTo` uses production origin even if the client
 * bundle lacked NEXT_PUBLIC_SITE_URL at build time or the user hit an old tab on localhost.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email =
    typeof body === "object" &&
    body !== null &&
    typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email.trim()
      : "";
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const origin = getAuthRedirectOriginServer();
  // Use /auth/callback/recovery — Supabase adds ?code= and strips other query params from redirectTo.
  const redirectTo = `${origin}/auth/callback/recovery`;

  const supabase = createClient(getSupabaseUrl(), getSupabasePublicKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    console.error("[request-password-reset]", error.message);
  }

  // Same response either way — avoid account enumeration
  return NextResponse.json({ ok: true });
}
