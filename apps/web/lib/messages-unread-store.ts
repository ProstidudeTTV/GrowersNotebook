/**
 * Lets the site header show an unread indicator while /messages is mounted or after a visit.
 * Updated from MessagesPanel when conversation state changes.
 */

type Snapshot = { anyUnread: boolean };

let snapshot: Snapshot = { anyUnread: false };
const listeners = new Set<() => void>();

export function subscribeMessagesUnread(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getMessagesUnreadSnapshot(): Snapshot {
  return snapshot;
}

export function setMessagesUnreadAny(anyUnread: boolean): void {
  if (snapshot.anyUnread === anyUnread) return;
  snapshot = { anyUnread };
  for (const cb of listeners) cb();
}
