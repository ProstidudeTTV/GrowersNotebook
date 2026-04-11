/**
 * Header badge for /notifications. Kept in sync from AuthNav (profile + realtime)
 * and NotificationsPanel when the full page loads or marks items read.
 */

const listeners = new Set<() => void>();
let unreadCount = 0;

export function subscribeNotificationsUnread(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getNotificationsUnreadSnapshot(): number {
  return unreadCount;
}

export function setNotificationsUnreadCount(n: number): void {
  const next = Math.max(0, Math.floor(Number(n)) || 0);
  if (next === unreadCount) return;
  unreadCount = next;
  for (const cb of listeners) cb();
}
