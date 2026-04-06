/**
 * Same localpart algorithm as API `MatrixService.localpartForUserId` (SHA-256, first 24 hex, `gn_` prefix).
 */
export async function matrixLocalpartForProfileId(
  profileId: string,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(profileId),
  );
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `gn_${hex.slice(0, 24)}`;
}

/** Build `@localpart:domain` using the domain from the signed-in user's MXID. */
export async function peerMxidForProfileId(
  peerProfileId: string,
  viewerMxid: string,
): Promise<string> {
  const lp = await matrixLocalpartForProfileId(peerProfileId);
  const colon = viewerMxid.lastIndexOf(":");
  const domain = colon >= 0 ? viewerMxid.slice(colon + 1) : "";
  if (!domain) return `@${lp}`;
  return `@${lp}:${domain}`;
}
