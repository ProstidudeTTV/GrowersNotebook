/** Resolves the Nest API base URL. Requires `NEXT_PUBLIC_API_URL` (see env.example). */
export function getPublicApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. Copy env.example to apps/web/.env.local and set NEXT_PUBLIC_API_URL.",
    );
  }
  return raw.replace(/\/+$/, "");
}
