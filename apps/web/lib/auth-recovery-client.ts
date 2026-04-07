/** Client-only hint: httpOnly cookies are per browser profile but not always shared the same way across tabs; this matches the reset email to the signed-in user. */

export const PASSWORD_RECOVERY_PENDING_KEY = "gn_pw_recovery_pending";

export type PasswordRecoveryPending = { until: number; email: string };

export function setPasswordRecoveryPending(
  email: string,
  maxAgeMs = 20 * 60 * 1000,
) {
  if (typeof window === "undefined") return;
  const normalized = email.trim().toLowerCase();
  const payload: PasswordRecoveryPending = {
    until: Date.now() + maxAgeMs,
    email: normalized,
  };
  localStorage.setItem(PASSWORD_RECOVERY_PENDING_KEY, JSON.stringify(payload));
}

export function readPasswordRecoveryPending(): PasswordRecoveryPending | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PASSWORD_RECOVERY_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { until?: unknown }).until === "number" &&
      typeof (parsed as { email?: unknown }).email === "string"
    ) {
      return parsed as PasswordRecoveryPending;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearPasswordRecoveryPending() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PASSWORD_RECOVERY_PENDING_KEY);
}
