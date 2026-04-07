import type { NextResponse } from "next/server";

/** Set by `POST /api/auth/request-password-reset`; read after PKCE so we route to update-password (GoTrue often uses `amr: [{ method: "otp" }]`, not `"recovery"`). */
export const PASSWORD_RECOVERY_FLOW_COOKIE = "gn_pw_recovery";
export const PASSWORD_RECOVERY_FLOW_VALUE = "1";
/** Seconds — enough to open the email link in the same browser session. */
export const PASSWORD_RECOVERY_FLOW_MAX_AGE = 60 * 20;

export function clearPasswordRecoveryFlowCookie(response: NextResponse) {
  response.cookies.set(PASSWORD_RECOVERY_FLOW_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
}
