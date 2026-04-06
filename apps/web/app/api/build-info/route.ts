import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Used by the client to detect new deploys and reload (see AppVersionRefresh).
 * Set NEXT_PUBLIC_APP_BUILD_ID in CI for deterministic ids; otherwise Render/vercel env is used.
 */
export async function GET() {
  const id =
    process.env.NEXT_PUBLIC_APP_BUILD_ID?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.RENDER_GIT_COMMIT?.trim() ||
    "development";
  return NextResponse.json({ id });
}
