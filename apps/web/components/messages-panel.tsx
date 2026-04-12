"use client";

import Link from "next/link";
import { DmImageLightbox } from "@/components/dm-image-lightbox";
import { DmSharedPostEmbed } from "@/components/dm-shared-post-embed";
import { apiFetch } from "@/lib/api-public";
import { setMessagesUnreadAny } from "@/lib/messages-unread-store";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import {
  buildPostShareDmBody,
  captionWithoutShareUrl,
  clientAbsolutePostUrl,
  firstPostShareMatch,
} from "@/lib/post-share";
import { StackedDmStyleImages } from "@/components/stacked-dm-style-images";
import { uploadPostImage } from "@/lib/upload-post-media";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

const POLL_MS = 3000;
const DM_ATTACH_MAX = 8;

type PendingAttachment = {
  id: string;
  /** Local blob URL for instant preview; revoked after upload. */
  localBlobUrl?: string;
  remoteUrl?: string;
  uploading: boolean;
  error?: string;
};

function revokePendingLocal(a: PendingAttachment) {
  if (a.localBlobUrl) URL.revokeObjectURL(a.localBlobUrl);
}

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
    imageUrls?: string[];
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
  imageUrls?: string[];
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

function messageImageUrls(
  m: Pick<MessageRow, "imageUrls" | "imageUrl">,
): string[] {
  const fromApi = m.imageUrls?.filter(Boolean) ?? [];
  if (fromApi.length) return fromApi;
  return m.imageUrl ? [m.imageUrl] : [];
}

/** Stable compare for poll refresh without resetting scroll. */
function messagesListFingerprint(items: MessageRow[]): string {
  if (items.length === 0) return "0";
  const first = items[0];
  const last = items[items.length - 1];
  return `${items.length}:${first.id}:${last.id}`;
}

function threadPreviewLine(
  m: ThreadSummary["lastMessage"],
): string | null {
  if (!m) return null;
  const t = m.body?.trim() ?? "";
  if (t) return t.length > 72 ? `${t.slice(0, 70)}…` : t;
  const n = messageImageUrls(m).length;
  if (n === 1) return "Photo";
  if (n > 1) return `${n} photos`;
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
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);
  const [lightbox, setLightbox] = useState<{
    urls: string[];
    index: number;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [messageDeletingId, setMessageDeletingId] = useState<string | null>(
    null,
  );
  const dmAttachInputId = useId();
  const [openingFromQuery, setOpeningFromQuery] = useState(false);
  const deepLinkProcessedOk = useRef<string | null>(null);
  const sharePostPrefillDone = useRef<string | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const scrollStickBottom = useRef(true);
  const pendingAttachmentsRef = useRef(pendingAttachments);
  pendingAttachmentsRef.current = pendingAttachments;

  useEffect(() => {
    return () => {
      for (const a of pendingAttachmentsRef.current) revokePendingLocal(a);
    };
  }, []);

  const removePendingAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => {
      const found = prev.find((x) => x.id === id);
      if (found) revokePendingLocal(found);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

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
    async (
      threadId: string,
      before?: string,
      appendOlder?: boolean,
      opts?: { backgroundPoll?: boolean },
    ) => {
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
      } else if (opts?.backgroundPoll) {
        setMessages((prev) => {
          if (
            messagesListFingerprint(prev) ===
            messagesListFingerprint(data.items)
          ) {
            return prev;
          }
          return data.items;
        });
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
      void loadMessagesPage(activeThreadId, undefined, false, {
        backgroundPoll: true,
      });
    }, POLL_MS);
    return () => clearInterval(id);
  }, [status, activeThreadId, loadMessagesPage]);

  useEffect(() => {
    if (status !== "ready") return;
    const onFocus = () => {
      void loadThreads();
      if (activeThreadId) {
        void loadMessagesPage(activeThreadId, undefined, false, {
          backgroundPoll: true,
        });
      }
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

  useEffect(() => {
    const sid = searchParams.get("sharePost")?.trim();
    if (!sid) {
      sharePostPrefillDone.current = null;
      return;
    }
    if (status !== "ready" || !selfId) return;
    if (sharePostPrefillDone.current === sid) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await apiFetch<{ title: string }>(`/posts/${sid}`, {
          method: "GET",
        });
        if (cancelled) return;
        setDraft(
          buildPostShareDmBody(
            p.title ?? "",
            clientAbsolutePostUrl(sid),
          ),
        );
        sharePostPrefillDone.current = sid;
        router.replace("/messages", { scroll: false });
      } catch {
        if (!cancelled) {
          sharePostPrefillDone.current = null;
          setActionError("Could not load that post to share.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, selfId, searchParams, router]);

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
    if (threadId !== activeThreadId) {
      setPendingAttachments((prev) => {
        for (const a of prev) revokePendingLocal(a);
        return [];
      });
    }
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
    const uploading = pendingAttachments.some((a) => a.uploading);
    const hasError = pendingAttachments.some((a) => a.error);
    const remoteUrls = pendingAttachments
      .map((a) => a.remoteUrl)
      .filter(Boolean) as string[];
    const allUploaded =
      pendingAttachments.length === 0 ||
      (remoteUrls.length === pendingAttachments.length &&
        !uploading &&
        !hasError);
    if (!activeThreadId || (!text && remoteUrls.length === 0)) return;
    if (pendingAttachments.length > 0 && !allUploaded) {
      if (uploading) {
        setActionError("Wait for photos to finish uploading.");
      } else if (hasError) {
        setActionError("Remove photos that failed to upload, then try again.");
      } else {
        setActionError("Photos are not ready to send yet.");
      }
      return;
    }
    setActionError(null);
    try {
      const token = await fetchToken();
      if (!token) throw new Error("Not signed in.");
      const payload: { body: string; imageUrls?: string[] } = {
        body: text,
      };
      if (remoteUrls.length) payload.imageUrls = remoteUrls;
      await apiFetch(`/direct-messages/threads/${activeThreadId}/messages`, {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });
      setDraft("");
      setPendingAttachments([]);
      scrollStickBottom.current = true;
      await loadMessagesPage(activeThreadId);
      await loadThreads();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not send this message.",
      );
    }
  };

  const removeOwnMessage = async (messageId: string) => {
    if (!activeThreadId) return;
    if (!window.confirm("Remove this message from the chat?")) return;
    setActionError(null);
    setMessageDeletingId(messageId);
    try {
      const token = await fetchToken();
      if (!token) throw new Error("Not signed in.");
      await apiFetch(
        `/direct-messages/threads/${activeThreadId}/messages/${messageId}`,
        { method: "DELETE", token },
      );
      await loadMessagesPage(activeThreadId);
      await loadThreads();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not delete message.",
      );
    } finally {
      setMessageDeletingId(null);
    }
  };

  const onImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = input.files;
    const resetInput = () => {
      requestAnimationFrame(() => {
        input.value = "";
      });
    };

    if (!files?.length) {
      resetInput();
      return;
    }
    if (!selfId) {
      setActionError("Sign in to attach photos.");
      resetInput();
      return;
    }

    setActionError(null);
    const room = DM_ATTACH_MAX - pendingAttachments.length;
    if (room <= 0) {
      resetInput();
      return;
    }
    const list = Array.from(files).slice(0, room);
    resetInput();
    const newItems: PendingAttachment[] = list.map((file) => ({
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      localBlobUrl: URL.createObjectURL(file),
      uploading: true,
    }));

    setPendingAttachments((prev) => [...prev, ...newItems]);

    void Promise.all(
      list.map(async (file, i) => {
        const itemId = newItems[i]!.id;
        try {
          const r = await uploadPostImage(supabase, selfId, file);
          setPendingAttachments((prev) => {
            const cur = prev.find((x) => x.id === itemId);
            if (!cur) return prev;
            if (!r.ok) {
              return prev.map((x) =>
                x.id === itemId
                  ? { ...x, uploading: false, error: r.message }
                  : x,
              );
            }
            revokePendingLocal(cur);
            return prev.map((x) =>
              x.id === itemId
                ? {
                    ...x,
                    uploading: false,
                    remoteUrl: r.publicUrl,
                    localBlobUrl: undefined,
                    error: undefined,
                  }
                : x,
            );
          });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Could not upload image.";
          setPendingAttachments((prev) => {
            const cur = prev.find((x) => x.id === itemId);
            if (!cur) return prev;
            return prev.map((x) =>
              x.id === itemId
                ? { ...x, uploading: false, error: message }
                : x,
            );
          });
        }
      }),
    );
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
      {lightbox ? (
        <DmImageLightbox
          urls={lightbox.urls}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
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
                  <div
                    role="button"
                    tabIndex={0}
                    className={`w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm ${
                      t.id === activeThreadId
                        ? "bg-[var(--gn-surface-hover)] text-[var(--gn-text)]"
                        : "text-[var(--gn-text-muted)] hover:bg-[var(--gn-surface-hover)]"
                    }`}
                    onClick={() => void selectThread(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void selectThread(t.id);
                      }
                    }}
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
                          <Link
                            href={`/u/${t.peer.id}`}
                            className="text-[var(--gn-text)] hover:text-[#ff6a38] hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {displayNameFor(t.peer.id, selfId, t.peer)}
                          </Link>
                        </span>
                        {threadPreviewLine(t.lastMessage) ? (
                          <span className="mt-0.5 block truncate text-xs text-[var(--gn-text-muted)]">
                            {threadPreviewLine(t.lastMessage)}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </div>
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
              <Link
                href={`/u/${activePeer.id}`}
                className="font-medium text-[var(--gn-text)] hover:text-[#ff6a38] hover:underline"
              >
                {displayNameFor(activePeer.id, selfId, activePeer)}
              </Link>
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
                  messages.map((ln) => {
                    const imgs = messageImageUrls(ln);
                    const share = firstPostShareMatch(ln.body);
                    const caption = share
                      ? captionWithoutShareUrl(ln.body, share.fullUrl).trim()
                      : ln.body.trim();
                    const showPostEmbed = Boolean(share);
                    const hasText = caption.length > 0;
                    const hasMedia = imgs.length > 0;
                    return (
                      <div
                        key={ln.id}
                        className={`rounded-lg border border-[var(--gn-ring)] bg-[var(--gn-surface-raised)] px-2.5 py-2 text-sm shadow-[var(--gn-shadow-sm)] ${imgs.length > 1 ? "overflow-visible" : ""}`}
                      >
                        <div className="flex min-w-0 flex-col overflow-visible">
                          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[0.95em] leading-snug font-medium text-[var(--gn-accent)]">
                            <span>
                              {selfId && ln.senderId === selfId ? (
                                "You"
                              ) : (
                                <Link
                                  href={`/u/${ln.senderId}`}
                                  className="hover:text-[#ff6a38] hover:underline"
                                >
                                  {displayNameFor(
                                    ln.senderId,
                                    selfId,
                                    activePeer,
                                  )}
                                </Link>
                              )}
                            </span>
                            {selfId && ln.senderId === selfId ? (
                              <button
                                type="button"
                                disabled={messageDeletingId === ln.id}
                                onClick={() => void removeOwnMessage(ln.id)}
                                className="text-[11px] font-normal text-red-400/90 hover:text-red-300 hover:underline disabled:opacity-45"
                              >
                                {messageDeletingId === ln.id
                                  ? "Removing…"
                                  : "Delete"}
                              </button>
                            ) : null}
                          </div>
                          {hasText ? (
                            <p className="mt-1.5 whitespace-pre-wrap break-words text-[var(--gn-text)]">
                              {caption}
                            </p>
                          ) : null}
                          {showPostEmbed && share ? (
                            <DmSharedPostEmbed postId={share.postId} />
                          ) : null}
                          {(hasText || showPostEmbed) && hasMedia ? (
                            <div
                              className="my-2.5 border-t border-[var(--gn-divide)]"
                              role="separator"
                            />
                          ) : null}
                          {hasMedia ? (
                            <div
                              className={`overflow-visible ${hasText || showPostEmbed ? "" : "mt-1.5"}`}
                            >
                              <StackedDmStyleImages
                                urls={imgs}
                                stackKey={ln.id}
                                pileLabel={
                                  imgs.length > 1
                                    ? selfId && ln.senderId === selfId
                                      ? `You sent ${imgs.length} photos`
                                      : `${displayNameFor(ln.senderId, selfId, activePeer)} sent ${imgs.length} photos`
                                    : null
                                }
                                onOpen={(index) =>
                                  setLightbox({ urls: imgs, index })
                                }
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
          <div className="space-y-2">
            <input
              id={dmAttachInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => void onImageFileChange(e)}
            />
            {pendingAttachments.length > 0 ? (
              <div className="rounded-md border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-xs text-[var(--gn-text-muted)]">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[var(--gn-text)]">
                    {pendingAttachments.length} photo
                    {pendingAttachments.length === 1 ? "" : "s"}{" "}
                    {pendingAttachments.some((a) => a.uploading)
                      ? "(uploading…)"
                      : pendingAttachments.every((a) => a.remoteUrl)
                        ? "ready"
                        : ""}
                  </span>
                  <button
                    type="button"
                    className="font-semibold text-[#ff6a38] hover:underline"
                    onClick={() => {
                      setPendingAttachments((prev) => {
                        for (const a of prev) revokePendingLocal(a);
                        return [];
                      });
                    }}
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pendingAttachments.map((att, i) => {
                    const src = att.remoteUrl ?? att.localBlobUrl ?? "";
                    return (
                      <div
                        key={att.id}
                        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] sm:h-16 sm:w-16"
                      >
                        {src ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={src}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        ) : null}
                        {att.uploading ? (
                          <div
                            className="absolute inset-0 flex items-center justify-center bg-black/35 text-[10px] font-medium text-white"
                            aria-hidden
                          >
                            …
                          </div>
                        ) : null}
                        {att.error ? (
                          <div
                            className="absolute inset-0 flex items-center justify-center bg-red-600/85 p-1 text-center text-[9px] font-medium leading-tight text-white"
                            title={att.error}
                          >
                            Failed
                          </div>
                        ) : null}
                        <button
                          type="button"
                          className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--gn-surface)] bg-[var(--gn-text)] text-sm font-light leading-none text-[var(--gn-surface)] shadow-md hover:bg-[var(--gn-text-muted)]"
                          aria-label={`Remove photo ${i + 1}`}
                          onClick={() => removePendingAttachment(att.id)}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
              <input
                className="min-h-11 min-w-0 w-full flex-1 rounded-md border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-sm text-[var(--gn-text)]"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                disabled={!activeThreadId}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <div className="flex min-h-11 shrink-0 items-stretch gap-2 sm:min-h-0 sm:items-center">
                {!activeThreadId ||
                pendingAttachments.length >= DM_ATTACH_MAX ? (
                  <span
                    className="inline-flex flex-1 cursor-not-allowed items-center justify-center rounded-md border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-center text-sm font-medium text-[var(--gn-text)] opacity-50 sm:flex-initial"
                    aria-disabled
                  >
                    Photo
                  </span>
                ) : (
                  <label
                    htmlFor={dmAttachInputId}
                    className="inline-flex flex-1 cursor-pointer touch-manipulation select-none items-center justify-center rounded-md border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-center text-sm font-medium text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)] sm:flex-initial"
                  >
                    Photo
                  </label>
                )}
                <button
                  type="button"
                  className="min-w-[5.5rem] flex-1 rounded-md bg-[#ff6a38] px-4 py-2 text-sm font-medium text-white hover:bg-[#ff7d4c] disabled:opacity-50 sm:flex-initial"
                  disabled={(() => {
                    if (!activeThreadId) return true;
                    const uploading = pendingAttachments.some((a) => a.uploading);
                    const hasErr = pendingAttachments.some((a) => a.error);
                    const remotes = pendingAttachments.filter((a) => a.remoteUrl);
                    const incomplete =
                      pendingAttachments.length > 0 &&
                      remotes.length !== pendingAttachments.length;
                    if (uploading || hasErr || incomplete) return true;
                    return (
                      !draft.trim() &&
                      remotes.length === 0
                    );
                  })()}
                  onClick={() => void sendMessage()}
                >
                  Send
                </button>
              </div>
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
