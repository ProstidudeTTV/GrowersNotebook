"use client";

import { DmImageLightbox } from "@/components/dm-image-lightbox";
import { apiFetch } from "@/lib/api-public";
import { setMessagesUnreadAny } from "@/lib/messages-unread-store";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import { uploadPostImage } from "@/lib/upload-post-media";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

const POLL_MS = 3000;

type OpenThreadResponse = {
  threadId: string;
  peer: { id: string; displayName: string | null };
};

type ThreadSummary = {
  id: string;
  peer: { id: string; displayName: string | null };
  lastMessage: {
    id: string;
    body: string;
    imageUrl?: string | null;
    senderId: string;
    createdAt: string;
  } | null;
  unread: boolean;
  lastMessageAt: string | null;
};

type ListThreadsResponse = { items: ThreadSummary[] };

type MessageRow = {
  id: string;
  senderId: string;
  body: string;
  imageUrl?: string | null;
  createdAt: string;
};

type ListMessagesResponse = {
  items: MessageRow[];
  oldestId: string | null;
  hasMore: boolean;
};

function displayNameFor(
  profileId: string | null | undefined,
  selfId: string | null,
  peer?: { id: string; displayName: string | null },
): string {
  if (profileId && selfId && profileId === selfId) return "You";
  if (peer && profileId === peer.id) {
    const n = peer.displayName?.trim();
    if (n) return n;
  }
  return "Grower";
}

function threadPreviewLine(
  m: ThreadSummary["lastMessage"],
): string | null {
  if (!m) return null;
  const t = m.body?.trim() ?? "";
  if (t) return t.length > 72 ? `${t.slice(0, 70)}…` : t;
  if (m.imageUrl) return "Photo";
  return null;
}

export function MessagesPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [selfId, setSelfId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [openingFromQuery, setOpeningFromQuery] = useState(false);
  const deepLinkProcessedOk = useRef<string | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const scrollStickBottom = useRef(true);

  const fetchToken = useCallback(async () => {
    return getAccessTokenForApi(supabase);
  }, [supabase]);

  const loadThreads = useCallback(async () => {
    const token = await fetchToken();
    if (!token) return;
    const data = await apiFetch<ListThreadsResponse>("/direct-messages/threads", {
      method: "GET",
      token,
    });
    setThreads(data.items);
    const anyUnread = data.items.some((t) => t.unread);
    setMessagesUnreadAny(anyUnread);
  }, [fetchToken]);

  const loadMessagesPage = useCallback(
    async (threadId: string, before?: string, appendOlder?: boolean) => {
      const token = await fetchToken();
      if (!token) return;
      const q = new URLSearchParams();
      q.set("limit", "50");
      if (before) q.set("before", before);
      const data = await apiFetch<ListMessagesResponse>(
        `/direct-messages/threads/${threadId}/messages?${q.toString()}`,
        { method: "GET", token },
      );
      if (appendOlder && before) {
        setMessages((prev) => [...data.items, ...prev]);
      } else {
        setMessages(data.items);
        scrollStickBottom.current = true;
      }
      setHasMore(data.hasMore);
    },
    [fetchToken],
  );

  const markRead = useCallback(
    async (threadId: string) => {
      const token = await fetchToken();
      if (!token) return;
      await apiFetch(`/direct-messages/threads/${threadId}/read`, {
        method: "POST",
        token,
      });
      void loadThreads();
    },
    [fetchToken, loadThreads],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user?.id) {
        setStatus("error");
        setError("Sign in to view messages.");
        return;
      }
      setSelfId(session.user.id);
      setStatus("ready");
      try {
        await loadThreads();
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setError(
            e instanceof Error ? e.message : "Could not load conversations.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, loadThreads]);

  useEffect(() => {
    if (status !== "ready") return;
    const id = window.setInterval(() => {
      void loadThreads();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [status, loadThreads]);

  useEffect(() => {
    if (status !== "ready" || !activeThreadId) return;
    const id = window.setInterval(() => {
      void loadMessagesPage(activeThreadId);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [status, activeThreadId, loadMessagesPage]);

  useEffect(() => {
    if (status !== "ready") return;
    const onFocus = () => {
      void loadThreads();
      if (activeThreadId) void loadMessagesPage(activeThreadId);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [status, activeThreadId, loadThreads, loadMessagesPage]);

  useEffect(() => {
    const withId = searchParams.get("with")?.trim();
    if (!withId) {
      deepLinkProcessedOk.current = null;
      return;
    }
    if (status !== "ready" || !selfId) return;
    if (deepLinkProcessedOk.current === withId) return;
    let cancelled = false;
    (async () => {
      setOpeningFromQuery(true);
      setActionError(null);
      try {
        const token = await fetchToken();
        if (!token || cancelled) return;
        const opened = await apiFetch<OpenThreadResponse>(
          "/direct-messages/threads/open",
          {
            method: "POST",
            token,
            body: JSON.stringify({ peerProfileId: withId }),
          },
        );
        if (cancelled) return;
        deepLinkProcessedOk.current = withId;
        setActiveThreadId(opened.threadId);
        await loadMessagesPage(opened.threadId);
        await markRead(opened.threadId);
        await loadThreads();
        router.replace("/messages", { scroll: false });
      } catch (e) {
        deepLinkProcessedOk.current = null;
        if (!cancelled) {
          setActionError(
            e instanceof Error
              ? e.message
              : "Could not open a chat with that user.",
          );
        }
      } finally {
        if (!cancelled) setOpeningFromQuery(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    status,
    selfId,
    searchParams,
    fetchToken,
    loadMessagesPage,
    markRead,
    loadThreads,
    router,
  ]);

  useLayoutEffect(() => {
    const el = timelineRef.current;
    if (!el || !scrollStickBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onTimelineScroll = () => {
    const el = timelineRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    scrollStickBottom.current = gap < 80;
  };

  const selectThread = async (threadId: string) => {
    setActionError(null);
    setActiveThreadId(threadId);
    scrollStickBottom.current = true;
    try {
      await loadMessagesPage(threadId);
      await markRead(threadId);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not load this conversation.",
      );
    }
  };

  const loadOlder = async () => {
    if (!activeThreadId || !messages[0] || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    setActionError(null);
    const prevHeight = timelineRef.current?.scrollHeight ?? 0;
    try {
      await loadMessagesPage(activeThreadId, messages[0].id, true);
      requestAnimationFrame(() => {
        const el = timelineRef.current;
        if (el) {
          el.scrollTop = el.scrollHeight - prevHeight;
        }
      });
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not load older messages.",
      );
    } finally {
      setLoadingOlder(false);
    }
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!activeThreadId || (!text && !pendingImageUrl)) return;
    setActionError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error("Not signed in.");
      const payload: { body: string; imageUrl?: string } = {
        body: text,
      };
      if (pendingImageUrl) payload.imageUrl = pendingImageUrl;
      await apiFetch(`/direct-messages/threads/${activeThreadId}/messages`, {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });
      setDraft("");
      setPendingImageUrl(null);
      scrollStickBottom.current = true;
      await loadMessagesPage(activeThreadId);
      await loadThreads();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not send this message.",
      );
    }
  };

  const onPickImage = () => {
    fileInputRef.current?.click();
  };

  const onImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selfId) return;
    setActionError(null);
    setImageBusy(true);
    try {
      const r = await uploadPostImage(supabase, selfId, file);
      if (!r.ok) {
        setActionError(r.message);
        return;
      }
      setPendingImageUrl(r.publicUrl);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not upload image.",
      );
    } finally {
      setImageBusy(false);
    }
  };

  if (status === "idle") {
    return (
      <p className="text-sm text-[var(--gn-text-muted)]">Loading…</p>
    );
  }

  if (status === "error" && error) {
    return (
      <div
        className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-elevated)] p-4 text-sm text-[var(--gn-text)]"
        role="alert"
      >
        {error}
      </div>
    );
  }

  const activePeer = threads.find((t) => t.id === activeThreadId)?.peer;
  const hasNoThreads = threads.length === 0;

  return (
    <div className="space-y-4 border-t border-[var(--gn-divide)] pt-4">
      {lightboxSrc ? (
        <DmImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      ) : null}
      {actionError ? (
        <div
          className="rounded-lg border border-red-300/50 bg-red-500/10 px-4 py-3 text-sm text-[var(--gn-text)]"
          role="alert"
        >
          <p className="font-medium text-red-700 dark:text-red-400">
            Messaging
          </p>
          <p className="mt-1 text-[var(--gn-text-muted)]">{actionError}</p>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-[#ff6a38] hover:underline"
            onClick={() => setActionError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {hasNoThreads ? (
        <div className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-3 text-sm">
          <p className="font-medium text-[var(--gn-text)]">No conversations yet</p>
          <p className="mt-1.5 leading-relaxed text-[var(--gn-text-muted)]">
            New chats start from a profile: follow someone, then use{" "}
            <span className="font-medium text-[var(--gn-text)]">Message</span> on
            their page. Open chats will show in the list here.
          </p>
        </div>
      ) : null}
      <div className="flex min-h-[420px] flex-col gap-4 lg:flex-row">
        <div className="flex w-full shrink-0 flex-col border-[var(--gn-divide)] lg:w-64 lg:border-r lg:pr-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
            Conversations
          </p>
          <ul className="max-h-64 space-y-1 overflow-y-auto lg:max-h-[min(60vh,520px)]">
            {threads.length === 0 ? (
              <li className="text-xs text-[var(--gn-text-muted)]">
                No open chats—use Message on a profile you follow to start one.
              </li>
            ) : (
              threads.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                      t.id === activeThreadId
                        ? "bg-[var(--gn-surface-hover)] text-[var(--gn-text)]"
                        : "text-[var(--gn-text-muted)] hover:bg-[var(--gn-surface-hover)]"
                    }`}
                    onClick={() => void selectThread(t.id)}
                  >
                    <span className="flex w-full items-start gap-2 text-left">
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          t.unread ? "bg-[#ff6a38]" : "invisible"
                        }`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">
                          {displayNameFor(t.peer.id, selfId, t.peer)}
                        </span>
                        {threadPreviewLine(t.lastMessage) ? (
                          <span className="mt-0.5 block truncate text-xs text-[var(--gn-text-muted)]">
                            {threadPreviewLine(t.lastMessage)}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="min-w-0 flex-1">
          {openingFromQuery ? (
            <p className="mb-2 text-xs text-[var(--gn-text-muted)]">
              Opening chat…
            </p>
          ) : null}
          {activeThreadId && activePeer ? (
            <p className="mb-2 text-xs text-[var(--gn-text-muted)]">
              Chat with{" "}
              <span className="font-medium text-[var(--gn-text)]">
                {displayNameFor(activePeer.id, selfId, activePeer)}
              </span>
            </p>
          ) : null}
          <div
            ref={timelineRef}
            onScroll={onTimelineScroll}
            className="gn-messages-timeline mb-3 flex max-h-[min(52vh,420px)] min-h-[200px] flex-col gap-2 overflow-y-auto rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-3 shadow-[var(--gn-shadow-sm)]"
          >
            {!activeThreadId ? (
              <p className="text-xs text-[var(--gn-text-muted)]">
                {hasNoThreads
                  ? "After you start a chat from someone’s profile, select it here to read and reply."
                  : "Select a conversation to read and reply."}
              </p>
            ) : (
              <>
                {hasMore ? (
                  <div className="flex justify-center pb-1">
                    <button
                      type="button"
                      className="text-xs font-medium text-[#ff6a38] hover:underline disabled:opacity-50"
                      disabled={loadingOlder}
                      onClick={() => void loadOlder()}
                    >
                      {loadingOlder ? "Loading…" : "Load earlier messages"}
                    </button>
                  </div>
                ) : null}
                {messages.length === 0 ? (
                  <p className="text-xs text-[var(--gn-text-muted)]">
                    No messages in this chat yet. Say hello below—your thread
                    will build from here.
                  </p>
                ) : (
                  messages.map((ln) => (
                    <div
                      key={ln.id}
                      className="rounded-lg border border-[var(--gn-ring)] bg-[var(--gn-surface-raised)] px-2.5 py-2 text-sm shadow-[var(--gn-shadow-sm)]"
                    >
                      <div className="text-[0.95em] leading-snug font-medium text-[var(--gn-accent)]">
                        {displayNameFor(ln.senderId, selfId, activePeer)}
                      </div>
                      {ln.imageUrl ? (
                        <button
                          type="button"
                          className="mt-1.5 block w-full max-w-full border-0 bg-transparent p-0 text-left"
                          onClick={() => setLightboxSrc(ln.imageUrl!)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ln.imageUrl}
                            alt=""
                            className="max-h-48 w-full max-w-full cursor-zoom-in object-contain"
                          />
                        </button>
                      ) : null}
                      {ln.body.trim() ? (
                        <p className="mt-2 whitespace-pre-wrap break-words text-[var(--gn-text)]">
                          {ln.body}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </>
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => void onImageFileChange(e)}
            />
            {pendingImageUrl ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-xs text-[var(--gn-text-muted)]">
                <span className="text-[var(--gn-text)]">Image ready to send</span>
                <button
                  type="button"
                  className="font-semibold text-[#ff6a38] hover:underline"
                  onClick={() => setPendingImageUrl(null)}
                >
                  Remove
                </button>
              </div>
            ) : null}
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-md border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-sm text-[var(--gn-text)]"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                disabled={!activeThreadId || imageBusy}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <button
                type="button"
                className="shrink-0 rounded-md border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-sm font-medium text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)] disabled:opacity-50"
                disabled={!activeThreadId || imageBusy}
                onClick={onPickImage}
              >
                Photo
              </button>
              <button
                type="button"
                className="rounded-md bg-[#ff6a38] px-4 py-2 text-sm font-medium text-white hover:bg-[#ff7d4c] disabled:opacity-50"
                disabled={
                  !activeThreadId ||
                  imageBusy ||
                  (!draft.trim() && !pendingImageUrl)
                }
                onClick={() => void sendMessage()}
              >
                Send
              </button>
            </div>
            <p className="text-xs leading-relaxed text-[var(--gn-text-muted)]">
              Private between you and the other person on GrowersNotebook, like
              typical app messages. Content is readable by the service when
              needed for safety and operations—not end-to-end encrypted from
              Growers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
