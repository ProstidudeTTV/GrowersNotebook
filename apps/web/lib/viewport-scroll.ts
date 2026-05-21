/** Routes that manage their own scroll (full viewport shell, no page scroll). */
export function isViewportLockedPath(pathname: string): boolean {
  return (
    pathname === "/messages" ||
    pathname.startsWith("/messages/")
  );
}
