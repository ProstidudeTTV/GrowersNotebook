"use client";

export type NotificationOpenItem = {
  id: string;
  kind?: string | null;
  readAt: string | null;
  actionUrl?: string | null;
};

/**
 * Primary tap on a notification: moderation modal, in-app navigation, or mark read only.
 */
export function openNotificationFromUserGesture(opts: {
  n: NotificationOpenItem;
  title: string;
  body: string;
  markRead: (id: string) => void | Promise<void>;
  setModerationModal: (v: { title: string; body: string } | null) => void;
  router: { push: (href: string) => void };
  onNavigate?: () => void;
}): void {
  const { n, title, body, markRead, setModerationModal, router, onNavigate } =
    opts;
  if (n.kind === "moderation_warning") {
    setModerationModal({ title, body });
    if (!n.readAt) void markRead(n.id);
    return;
  }
  const raw = n.actionUrl?.trim();
  if (
    raw &&
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !raw.includes("://")
  ) {
    if (!n.readAt) void markRead(n.id);
    onNavigate?.();
    router.push(raw);
    return;
  }
  if (!n.readAt) void markRead(n.id);
}
