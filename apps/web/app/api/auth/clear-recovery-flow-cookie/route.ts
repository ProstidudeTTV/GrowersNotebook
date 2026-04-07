import { NextResponse } from "next/server";
import { clearPasswordRecoveryFlowCookie } from "@/lib/auth-recovery-cookie";

/** Clears the forgot-password hint cookie after implicit (hash) recovery handled client-side. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearPasswordRecoveryFlowCookie(res);
  return res;
}
