/** Safe `next` query for /login from the current pathname (and optional search). */
export function loginReturnPath(
  pathname: string,
  search?: string,
): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const q = search?.trim();
  const full = q ? `${path}?${q.replace(/^\?/, "")}` : path;
  if (full === "/login" || full.startsWith("/login?")) return "/following";
  if (full.startsWith("/auth/")) return "/following";
  return encodeURIComponent(full);
}

export function loginHref(pathname: string, search?: string): string {
  return `/login?next=${loginReturnPath(pathname, search)}`;
}
