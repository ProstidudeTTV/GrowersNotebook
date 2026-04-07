import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Password-reset emails sometimes use `redirect_to` = Site URL only (e.g.
 * `https://growersnotebook.com`). After `/auth/v1/verify`, Supabase sends users to
 * `/?code=...` — but PKCE exchange lives on `/auth/callback`, so forward params there.
 */
export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  if (url.pathname === "/" && url.searchParams.has("code")) {
    const callback = new URL("/auth/callback", url.origin);
    url.searchParams.forEach((value, key) => {
      callback.searchParams.set(key, value);
    });
    return NextResponse.redirect(callback);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
