"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import {
  buildPostShareDmBody,
  clientAbsolutePostUrl,
} from "@/lib/post-share";

type ThreadSummary = {
  id: string;
  peer: { id: string; displayName: string | null };
};

type ListThreadsResponse = { items: ThreadSummary[] };

export function PostShareButton({
  postId,
  postTitle,
  viewerId,
}: {
  postId: string;
  postTitle: string;
  viewerId: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [sendBusy, setSendBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const publicUrl = clientAbsolutePostUrl(postId);
  const shareBody = buildPostShareDmBody(postTitle, publicUrl);

  const fetchToken = useCallback(async () => {
    return getAccessTokenForApi(supabase);
  }, [supabase]);

  useEffect(() => {
    if (!menuOpen && !pickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (root.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, pickerOpen]);

  const loadThreads = useCallback(async () => {
    const token = await fetchToken();
    if (!token) return;
    setThreadsLoading(true);
    try {
      const data = await apiFetch<ListThreadsResponse>(
        "/direct-messages/threads",
        { method: "GET", token },
      );
      setThreads(data.items);
    } catch {
      setThreads([]);
    } finally {
      setThreadsLoading(false);
    }
  }, [fetchToken]);

  const copyLink = async () => {
    setNotice(null);
    try {
      await navigator.clipboard.writeText(publicUrl);
      setNotice("Link copied.");
      setMenuOpen(false);
      window.setTimeout(() => setNotice(null), 2500);
    } catch {
      setNotice("Could not copy — copy the URL from the address bar.");
      window.setTimeout(() => setNotice(null), 4000);
    }
  };

  const webShare = async () => {
    setNotice(null);
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: postTitle.trim() || "GrowersNotebook post",
        text: postTitle.trim() || "Post on GrowersNotebook",
        url: publicUrl,
      });
      setMenuOpen(false);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      await copyLink();
    }
  };

  const openChatPicker = () => {
    setMenuOpen(false);
    setPickerOpen(true);
    void loadThreads();
  };

  const sendToThread = async (threadId: string) => {
    const token = await fetchToken();
    if (!token) {
      setNotice("Sign in to send messages.");
      return;
    }
    setSendBusy(threadId);
    setNotice(null);
    try {
      await apiFetch(`/direct-messages/threads/${threadId}/messages`, {
        method: "POST",
        token,
        body: JSON.stringify({ body: shareBody }),
      });
      setPickerOpen(false);
      setNotice("Sent in chat.");
      window.setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Could not send to that chat.",
      );
    } finally {
      setSendBusy(null);
    }
  };

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen((v) => !v)}
        className="rounded-full border border-[var(--gn-ring)] bg-[var(--gn-surface-elevated)] px-3 py-1 text-xs font-medium text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)]"
      >
        Share
      </button>
      {notice ? (
        <p
          className="absolute left-0 top-full z-40 mt-1 max-w-[14rem] rounded-md border border-[var(--gn-border)] bg-[var(--gn-surface-raised)] px-2 py-1 text-[0.7rem] text-[var(--gn-text)] shadow-md"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      {menuOpen ? (
        <div
          className="gn-menu absolute left-0 top-full z-30 mt-1 min-w-[12rem] overflow-hidden py-1"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2 text-left text-sm text-[var(--gn-text)] hover:bg-[var(--gn-surface-muted)]"
            onClick={() => void copyLink()}
          >
            Copy link
          </button>
          {typeof navigator !== "undefined" &&
          typeof navigator.share === "function" ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-sm text-[var(--gn-text)] hover:bg-[var(--gn-surface-muted)]"
              onClick={() => void webShare()}
            >
              Share…
            </button>
          ) : null}
          {viewerId ? (
            <>
              <button
                type="button"
                role="menuitem"
                className="flex w-full px-3 py-2 text-left text-sm text-[var(--gn-text)] hover:bg-[var(--gn-surface-muted)]"
                onClick={openChatPicker}
              >
                Send to chat…
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full px-3 py-2 text-left text-sm text-[var(--gn-text)] hover:bg-[var(--gn-surface-muted)]"
                onClick={() => {
                  setMenuOpen(false);
                  router.push(
                    `/messages?sharePost=${encodeURIComponent(postId)}`,
                  );
                }}
              >
                Open Messages (prefill)
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {pickerOpen ? (
        <div
          className="fixed inset-0 z-[460] flex items-center justify-center bg-black/55 p-4"
          role="presentation"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="max-h-[min(70dvh,420px)] w-full max-w-md overflow-hidden rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-raised)] shadow-[var(--gn-shadow-lg)]"
            role="dialog"
            aria-modal="true"
            aria-label="Choose a conversation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--gn-divide)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--gn-text)]">
                Send to chat
              </p>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-medium text-[var(--gn-text-muted)] hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-text)]"
                onClick={() => setPickerOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="overflow-y-auto p-2">
              {threadsLoading ? (
                <p className="px-2 py-4 text-sm text-[var(--gn-text-muted)]">
                  Loading chats…
                </p>
              ) : threads.length === 0 ? (
                <p className="px-2 py-4 text-sm text-[var(--gn-text-muted)]">
                  No open conversations. Start a chat from someone’s profile,
                  then try again.
                </p>
              ) : (
                <ul className="space-y-1">
                  {threads.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        disabled={sendBusy !== null}
                        className="flex w-full rounded-lg px-3 py-2.5 text-left text-sm text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)] disabled:opacity-50"
                        onClick={() => void sendToThread(t.id)}
                      >
                        {sendBusy === t.id ? (
                          <span>Sending…</span>
                        ) : (
                          <span className="font-medium">
                            {t.peer.displayName?.trim() || "Grower"}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
