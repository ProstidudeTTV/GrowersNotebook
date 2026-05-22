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
import { ComposerQuickReactionsToolbar } from "@/components/composer-quick-reactions-toolbar";
import { dedupeUrlsPreserveOrder, isDmVideoUrl } from "@/lib/dm-media-url";
import {
  fetchGiphySearchItems,
  fetchGiphyTrendingItems,
} from "@/lib/giphy-search-client";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { stripUploadedVideoMetadata } from "@/lib/strip-uploaded-video-metadata";
import {
  isProcessablePostImage,
  isProcessablePostVideo,
  uploadPostImage,
  uploadPostVideo,
} from "@/lib/upload-post-media";
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

/** Fallback when Realtime is unavailable; primary updates use dm_realtime_signals. */
const POLL_MS = 25000;
const DM_ATTACH_MAX = 8;

type PendingAttachment = {
  id: string;
  /** Local blob URL for instant preview; revoked after upload. */
  localBlobUrl?: string;
  remoteUrl?: string;
  uploading: boolean;
  error?: string;
  /** Set after upload or for pasted GIF URLs. */
  kind?: "image" | "video";
  /** User upload vs Giphy/Tenor sticker (affects GIF button rules). */
  source?: "upload" | "giphy";
};

function revokePendingLocal(a: PendingAttachment) {
  if (a.localBlobUrl) URL.revokeObjectURL(a.localBlobUrl);
}

type OpenThreadResponse = {
  threadId: string;
  peer: { id: string; displayName: string | null };
};

type ProfileSearchItem = {
  id: string;
  displayName: string | null;
  description?: string | null;
  avatarUrl?: string | null;
};

type ProfileSearchResponse = {
  items: ProfileSearchItem[];
  total: number;
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
  const base = fromApi.length ? fromApi : m.imageUrl ? [m.imageUrl] : [];
  return dedupeUrlsPreserveOrder(base);
}

/** Stable compare for poll refresh without resetting scroll. */
function messagesListFingerprint(items: MessageRow[]): string {
  if (items.length === 0) return "0";
  const first = items[0];
  const last = items[items.length - 1];
  return `${items.length}:${first.id}:${last.id}`;
}

function dmAttachmentPileLabel(
  urls: string[],
  fromSelf: boolean,
  peerDisplay: string,
): string | null {
  if (urls.length <= 1) return null;
  const v = urls.filter(isDmVideoUrl).length;
  const who = fromSelf ? "You" : peerDisplay;
  if (v === urls.length) return `${who} sent ${urls.length} videos`;
  if (v > 0) return `${who} sent ${urls.length} attachments`;
  return `${who} sent ${urls.length} photos`;
}

function pendingAttachmentsHeadline(items: PendingAttachment[]): string {
  const n = items.length;
  if (n === 0) return "";
  let v = 0;
  for (const a of items) {
    if (
      a.kind === "video" ||
      Boolean(a.remoteUrl && isDmVideoUrl(a.remoteUrl))
    ) {
      v += 1;
    }
  }
  if (v === n) return n === 1 ? "1 video" : `${n} videos`;
  if (v === 0) return n === 1 ? "1 photo" : `${n} photos`;
  return `${n} attachments`;
}

function threadPreviewLine(
  m: ThreadSummary["lastMessage"],
): string | null {
  if (!m) return null;
  const t = m.body?.trim() ?? "";
  if (t) return t.length > 72 ? `${t.slice(0, 70)}…` : t;
  const urls = messageImageUrls(m);
  const n = urls.length;
  if (n === 0) return null;
  const v = urls.filter(isDmVideoUrl).length;
  if (v === n) return n === 1 ? "Video" : `${n} videos`;
  if (v > 0) return `${n} attachments`;
  if (n === 1) return "Photo";
  return `${n} photos`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
  return (parts[0]?.[0] ?? "G").toUpperCase();
}

const AVATAR_COLORS = [
  "bg-teal-700",
  "bg-[var(--gn-accent)]",
  "bg-sky-700",
  "bg-violet-700",
  "bg-rose-700",
];

function MiniAvatar({ name, size }: { name: string; size: number }) {
  const initials = getInitials(name);
  const colorIdx =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    AVATAR_COLORS.length;
  const bg = AVATAR_COLORS[colorIdx];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold uppercase text-white ${bg}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initials}
    </span>
  );
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
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifItems, setGifItems] = useState<
    { id?: string; url: string; preview: string; title: string }[]
  >([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifConfigured, setGifConfigured] = useState(true);
  const gifOffsetRef = useRef(0);
  const debouncedGifQuery = useDebouncedValue(gifQuery.trim(), 320);
  const gifFetchSeq = useRef(0);
  const lastGifPickMs = useRef(0);
  const [openingFromQuery, setOpeningFromQuery] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<ProfileSearchItem[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const debouncedUserSearch = useDebouncedValue(userSearchQuery.trim(), 320);
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

  const runGifSearch = useCallback(async (q: string, append = false) => {
    const trimmed = q.trim();
    const seq = ++gifFetchSeq.current;
    setGifLoading(true);
    const offset = append ? gifOffsetRef.current : 0;
    try {
      const res =
        trimmed.length >= 2
          ? await fetchGiphySearchItems(trimmed, { offset, limit: 24 })
          : await fetchGiphyTrendingItems({ offset, limit: 24 });
      if (seq === gifFetchSeq.current) {
        setGifConfigured(res.configured !== false);
        setGifItems((prev) =>
          append ? [...prev, ...res.items] : res.items,
        );
        gifOffsetRef.current = append
          ? gifOffsetRef.current + res.items.length
          : res.items.length;
      }
    } catch {
      if (seq === gifFetchSeq.current && !append) {
        setGifItems([]);
        setGifConfigured(true);
        gifOffsetRef.current = 0;
      }
    } finally {
      if (seq === gifFetchSeq.current) setGifLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!gifPickerOpen) {
      gifFetchSeq.current += 1;
      setGifLoading(false);
      gifOffsetRef.current = 0;
      return;
    }
    gifOffsetRef.current = 0;
    void runGifSearch(debouncedGifQuery);
  }, [debouncedGifQuery, gifPickerOpen, runGifSearch]);

  const addGifAttachment = useCallback((url: string) => {
    const now = Date.now();
    if (now - lastGifPickMs.current < 480) return;
    lastGifPickMs.current = now;
    setPendingAttachments((prev) => {
      if (prev.some((x) => x.source === "upload")) return prev;
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      return [
        {
          id,
          remoteUrl: url,
          uploading: false,
          kind: "image" as const,
          source: "giphy" as const,
        },
      ];
    });
    setGifPickerOpen(false);
    setGifQuery("");
    setGifItems([]);
  }, []);

  const fetchToken = useCallback(async () => {
    return getAccessTokenForApi(supabase);
  }, [supabase]);

  useEffect(() => {
    if (!showNewMessageModal || debouncedUserSearch.length < 2) {
      setUserSearchResults([]);
      setUserSearchLoading(false);
      return;
    }
    let cancelled = false;
    setUserSearchLoading(true);
    (async () => {
      try {
        const token = await fetchToken();
        if (!token || cancelled) return;
        const data = await apiFetch<ProfileSearchResponse>(
          `/profiles/search?q=${encodeURIComponent(debouncedUserSearch)}&pageSize=8&page=1`,
          { method: "GET", token },
        );
        if (!cancelled) setUserSearchResults(data.items);
      } catch {
        if (!cancelled) setUserSearchResults([]);
      } finally {
        if (!cancelled) setUserSearchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedUserSearch, showNewMessageModal, fetchToken]);

  const startConversation = useCallback(
    (user: ProfileSearchItem) => {
      setShowNewMessageModal(false);
      setUserSearchQuery("");
      setUserSearchResults([]);
      router.push(`/messages?with=${user.id}`);
    },
    [router],
  );

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

  /** Supabase Realtime: new DM signal rows (RLS limits to threads the user participates in). */
  useEffect(() => {
    if (status !== "ready" || !selfId) return;
    const channel = supabase
      .channel("dm-realtime-signals")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_realtime_signals",
        },
        (payload) => {
          const row = payload.new as {
            thread_id?: string;
            message_id?: string;
          };
          const tid = row.thread_id;
          if (!tid) return;
          void loadThreads();
          if (activeThreadId === tid) {
            void loadMessagesPage(tid, undefined, false, {
              backgroundPoll: true,
            });
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    status,
    selfId,
    supabase,
    activeThreadId,
    loadThreads,
    loadMessagesPage,
  ]);

  useEffect(() => {
    if (status !== "ready") return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void loadThreads();
      if (activeThreadId) {
        void loadMessagesPage(activeThreadId, undefined, false, {
          backgroundPoll: true,
        });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () =>
      document.removeEventListener("visibilitychange", onVisible);
  }, [status, activeThreadId, loadThreads, loadMessagesPage]);

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
    setGifPickerOpen(false);
    setGifQuery("");
    setGifItems([]);
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
        setActionError("Wait for uploads to finish.");
      } else if (hasError) {
        setActionError("Remove failed attachments, then try again.");
      } else {
        setActionError("Attachments are not ready to send yet.");
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

  const onMediaFileChange = (e: ChangeEvent<HTMLInputElement>) => {
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
      setActionError("Sign in to attach media.");
      resetInput();
      return;
    }

    setActionError(null);
    const room = DM_ATTACH_MAX - pendingAttachments.length;
    if (room <= 0) {
      resetInput();
      return;
    }
    const rawList = Array.from(files);
    const valid = rawList.filter(
      (file) => isProcessablePostImage(file) || isProcessablePostVideo(file),
    );
    if (valid.length < rawList.length) {
      setActionError(
        "Some files were skipped. Use JPEG, PNG, WebP, GIF or MP4, WebM, MOV.",
      );
    }
    const list = valid.slice(0, room);
    if (list.length === 0) {
      resetInput();
      return;
    }
    resetInput();
    const newItems: PendingAttachment[] = list.map((file) => ({
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      localBlobUrl: URL.createObjectURL(file),
      uploading: true,
      kind: isProcessablePostVideo(file) ? "video" : "image",
      source: "upload" as const,
    }));

    setPendingAttachments((prev) => {
      for (const a of prev) {
        if (a.source === "giphy") revokePendingLocal(a);
      }
      return [...prev.filter((x) => x.source !== "giphy"), ...newItems];
    });

    void Promise.all(
      list.map(async (file, i) => {
        const itemId = newItems[i]!.id;
        const isVid = isProcessablePostVideo(file);
        try {
          const r = isVid
            ? await uploadPostVideo(supabase, selfId, file)
            : await uploadPostImage(supabase, selfId, file);
          if (
            r.ok &&
            isVid &&
            "storagePath" in r &&
            r.storagePath &&
            r.videoContentType
          ) {
            const t = await fetchToken();
            if (t) {
              void stripUploadedVideoMetadata(
                t,
                r.storagePath,
                r.videoContentType,
              ).catch(() => {});
            }
          }
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
                    kind: isVid ? ("video" as const) : ("image" as const),
                    source: "upload" as const,
                  }
                : x,
            );
          });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Could not upload file.";
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
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-[var(--gn-text-muted)]">Loading…</p>
      </div>
    );
  }

  if (status === "error" && error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div
          className="w-full max-w-sm rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-elevated)] p-5 text-center text-sm text-[var(--gn-text)]"
          role="alert"
        >
          {error}
        </div>
      </div>
    );
  }

  const activePeer = threads.find((t) => t.id === activeThreadId)?.peer;
  const hasNoThreads = threads.length === 0;
  const pendingHasUploads = pendingAttachments.some(
    (a) => a.source === "upload",
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {lightbox ? (
        <DmImageLightbox
          urls={lightbox.urls}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      ) : null}

      {showNewMessageModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowNewMessageModal(false)}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-2xl bg-[var(--gn-surface-elevated)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-base font-semibold text-[var(--gn-text)]">
              New Message
            </h2>
            <input
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder="Search by username…"
              className="gn-input mb-4 w-full"
              autoFocus
            />
            {userSearchLoading ? (
              <p className="text-xs text-[var(--gn-text-muted)]">Searching…</p>
            ) : userSearchQuery.trim().length > 0 &&
              userSearchQuery.trim().length < 2 ? (
              <p className="text-xs text-[var(--gn-text-muted)]">
                Type at least 2 characters.
              </p>
            ) : userSearchResults.length === 0 &&
              debouncedUserSearch.length >= 2 ? (
              <p className="text-xs text-[var(--gn-text-muted)]">
                No users found.
              </p>
            ) : null}
            <div className="max-h-52 space-y-1 overflow-y-auto">
              {userSearchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => startConversation(user)}
                  className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-[var(--gn-surface-hover)]"
                >
                  <MiniAvatar
                    name={user.displayName?.trim() || "Grower"}
                    size={36}
                  />
                  <span className="text-sm font-medium text-[var(--gn-text)]">
                    {user.displayName?.trim() || "Grower"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {actionError ? (
        <div
          className="flex shrink-0 items-center gap-3 border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-sm"
          role="alert"
        >
          <p className="flex-1 text-red-400">{actionError}</p>
          <button
            type="button"
            className="shrink-0 text-xs font-semibold text-[var(--gn-accent)] hover:underline"
            onClick={() => setActionError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Two-panel messenger — one scroll per column; row layout on desktop */}
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">

        {/* Left: conversation list */}
        <aside
          className={`flex min-h-0 flex-col border-[var(--gn-divide)] lg:border-r ${
            activeThreadId ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[var(--gn-divide)] px-4 py-3">
            <h2 className="text-lg font-bold text-[var(--gn-text)]">Messages</h2>
            <button
              type="button"
              onClick={() => setShowNewMessageModal(true)}
              title="New message"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--gn-text-muted)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-accent)]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span className="sr-only">New message</span>
            </button>
          </div>

          <ul className="gn-scrollbar-themed min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {threads.length === 0 ? (
              <li className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--gn-surface-elevated)] text-2xl"
                  aria-hidden
                >
                  💬
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--gn-text)]">No messages yet</p>
                  <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
                    Start a conversation with a fellow grower
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewMessageModal(true)}
                  className="mt-1 rounded-full bg-[var(--gn-accent)] px-4 py-1.5 text-xs font-semibold text-black transition hover:brightness-110"
                >
                  Find Growers →
                </button>
              </li>
            ) : (
              threads.map((t) => {
                const isActive = t.id === activeThreadId;
                const peerName = displayNameFor(t.peer.id, selfId, t.peer);
                const preview = threadPreviewLine(t.lastMessage);
                return (
                  <li key={t.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      className={`relative flex cursor-pointer items-center gap-3 py-3 pr-4 transition-colors ${
                        isActive
                          ? "border-l-2 border-[var(--gn-accent)] bg-[var(--gn-surface-elevated)] pl-[14px]"
                          : "border-l-2 border-transparent pl-[14px] hover:bg-[var(--gn-surface-hover)]"
                      }`}
                      onClick={() => void selectThread(t.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          void selectThread(t.id);
                        }
                      }}
                    >
                      <span className="relative shrink-0">
                        <MiniAvatar name={peerName} size={40} />
                        {t.unread ? (
                          <span
                            className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[var(--gn-surface)] bg-[var(--gn-accent)]"
                            aria-label="Unread messages"
                          />
                        ) : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-1">
                          <span
                            className={`truncate text-sm ${
                              t.unread
                                ? "font-semibold text-[var(--gn-text)]"
                                : "font-medium text-[var(--gn-text)]"
                            }`}
                          >
                            <Link
                              href={`/u/${t.peer.id}`}
                              className="hover:text-[var(--gn-accent)] hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {peerName}
                            </Link>
                          </span>
                          {t.lastMessageAt ? (
                            <span className="shrink-0 text-[10px] text-[var(--gn-text-muted)]">
                              {new Date(t.lastMessageAt).toLocaleDateString(
                                undefined,
                                { month: "short", day: "numeric" },
                              )}
                            </span>
                          ) : null}
                        </div>
                        {preview ? (
                          <p
                            className={`mt-0.5 truncate text-xs ${
                              t.unread
                                ? "font-medium text-[var(--gn-text)]"
                                : "text-[var(--gn-text-muted)]"
                            }`}
                          >
                            {preview}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        {/* Right: active conversation */}
        <section
          className={`flex min-h-0 min-w-0 flex-col overflow-hidden ${
            activeThreadId ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* Chat header */}
          <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] px-4">
            {/* Back button — mobile only */}
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--gn-text-muted)] transition hover:bg-[var(--gn-surface-hover)] lg:hidden"
              onClick={() => setActiveThreadId(null)}
              aria-label="Back to conversations"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            {openingFromQuery ? (
              <p className="text-sm text-[var(--gn-text-muted)]">Opening chat…</p>
            ) : activePeer ? (
              <>
                <MiniAvatar
                  name={displayNameFor(activePeer.id, selfId, activePeer)}
                  size={32}
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${activePeer.id}`}
                    className="block truncate text-sm font-bold text-[var(--gn-text)] hover:text-[var(--gn-accent)] hover:underline"
                  >
                    {displayNameFor(activePeer.id, selfId, activePeer)}
                  </Link>
                  <p className="text-[10px] text-[var(--gn-text-muted)]">
                    Direct message
                  </p>
                </div>
                <Link
                  href={`/u/${activePeer.id}`}
                  className="shrink-0 text-xs text-[var(--gn-text-muted)] hover:text-[var(--gn-accent)] hover:underline"
                >
                  View profile
                </Link>
              </>
            ) : (
              <p className="text-sm text-[var(--gn-text-muted)]">
                {hasNoThreads
                  ? "Start a conversation from a profile page"
                  : "Select a conversation"}
              </p>
            )}
          </div>

          {/* Message timeline */}
          <div
            ref={timelineRef}
            onScroll={onTimelineScroll}
            className="gn-scrollbar-themed min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--gn-surface-muted)]"
          >
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
            {!activeThreadId ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--gn-surface-elevated)] text-4xl"
                  aria-hidden
                >
                  💬
                </div>
                <div>
                  <p className="text-base font-bold text-[var(--gn-text)]">Your Messages</p>
                  <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
                    Select a conversation to start chatting,
                    <br />
                    or find a grower to message.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewMessageModal(true)}
                  className="rounded-full bg-[var(--gn-accent)] px-5 py-2 text-sm font-semibold text-black transition hover:brightness-110"
                >
                  Find a Grower →
                </button>
              </div>
            ) : (
              <>
                {hasMore ? (
                  <div className="flex justify-center pb-1">
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--gn-accent)] hover:underline disabled:opacity-50"
                      disabled={loadingOlder}
                      onClick={() => void loadOlder()}
                    >
                      {loadingOlder ? "Loading…" : "Load earlier messages"}
                    </button>
                  </div>
                ) : null}
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-[var(--gn-text-muted)]">
                      No messages yet. Say hello! 👋
                    </p>
                  </div>
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
                    const isSelf = Boolean(selfId && ln.senderId === selfId);
                    const peerDisplay = displayNameFor(
                      ln.senderId,
                      selfId,
                      activePeer,
                    );
                    return (
                      <div
                        key={ln.id}
                        className={`flex items-end gap-2 ${isSelf ? "justify-end" : "justify-start"}`}
                      >
                        {!isSelf && (
                          <MiniAvatar name={peerDisplay} size={26} />
                        )}
                        <div
                          className={`max-w-[min(85%,18rem)] text-sm ${imgs.length > 1 ? "overflow-visible" : ""} ${
                            isSelf
                              ? "rounded-2xl rounded-br-sm border-l-[3px] border-[var(--gn-accent)] bg-[var(--gn-surface-elevated)] px-3 py-2 text-[var(--gn-text)] shadow-sm"
                              : "rounded-2xl rounded-bl-sm bg-[var(--gn-surface-raised)] px-3 py-2 text-[var(--gn-text)] ring-1 ring-[var(--gn-divide)]"
                          }`}
                        >
                          {hasText ? (
                            <p className="whitespace-pre-wrap break-words">
                              {caption}
                            </p>
                          ) : null}
                          {showPostEmbed && share ? (
                            <DmSharedPostEmbed postId={share.postId} />
                          ) : null}
                          {(hasText || showPostEmbed) && hasMedia ? (
                            <div
                              className={`my-2 border-t ${isSelf ? "border-black/20" : "border-[var(--gn-divide)]"}`}
                              role="separator"
                            />
                          ) : null}
                          {hasMedia ? (
                            <div className="overflow-visible">
                              <StackedDmStyleImages
                                urls={imgs}
                                stackKey={ln.id}
                                compact
                                pileLabel={dmAttachmentPileLabel(
                                  imgs,
                                  isSelf,
                                  peerDisplay,
                                )}
                                onOpen={(index) =>
                                  setLightbox({ urls: imgs, index })
                                }
                              />
                            </div>
                          ) : null}
                          <div
                            className={`mt-1 flex items-center gap-2 ${isSelf ? "justify-end" : "justify-start"}`}
                          >
                            <span
                              className={`text-[10px] ${isSelf ? "text-[var(--gn-on-accent)]/70" : "text-[var(--gn-text-muted)]"}`}
                            >
                              {new Date(ln.createdAt).toLocaleTimeString(
                                undefined,
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                            {isSelf ? (
                              <button
                                type="button"
                                disabled={messageDeletingId === ln.id}
                                onClick={() => void removeOwnMessage(ln.id)}
                                className="text-[10px] text-[var(--gn-on-accent)]/60 hover:text-[var(--gn-on-accent)] hover:underline disabled:opacity-45"
                              >
                                {messageDeletingId === ln.id
                                  ? "Removing…"
                                  : "Delete"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
            </div>
          </div>

          {/* Compose area — fixed footer; only the GIF list scrolls internally */}
          <div className="shrink-0 border-t border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] px-4 py-3">
            <div className="mx-auto w-full max-w-2xl">
            <input
              id={dmAttachInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              multiple
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => void onMediaFileChange(e)}
            />
            {pendingAttachments.length > 0 ? (
              <div className="mb-3 rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-xs text-[var(--gn-text-muted)]">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[var(--gn-text)]">
                    {pendingAttachmentsHeadline(pendingAttachments)}{" "}
                    {pendingAttachments.some((a) => a.uploading)
                      ? "(uploading…)"
                      : pendingAttachments.every((a) => a.remoteUrl)
                        ? "ready"
                        : ""}
                  </span>
                  <button
                    type="button"
                    className="font-semibold text-[var(--gn-accent)] hover:underline"
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
                    const showVideo =
                      Boolean(src) &&
                      (att.kind === "video" ||
                        isDmVideoUrl(att.remoteUrl ?? ""));
                    return (
                      <div
                        key={att.id}
                        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] sm:h-16 sm:w-16"
                      >
                        {showVideo ? (
                          <video
                            src={src}
                            muted
                            playsInline
                            preload="metadata"
                            className="h-full w-full object-contain"
                            aria-label="Video preview"
                          />
                        ) : src ? (
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
                          aria-label={`Remove attachment ${i + 1}`}
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
            <ComposerQuickReactionsToolbar
              disabled={!activeThreadId}
              onEmojiAppend={(emoji) => setDraft((t) => t + emoji)}
              emojiPlacement="above"
              emojiUsePortal
              gifSlot={
                <button
                  type="button"
                  disabled={
                    !selfId ||
                    !activeThreadId ||
                    pendingAttachments.length >= DM_ATTACH_MAX ||
                    pendingHasUploads
                  }
                  className="inline-flex h-8 shrink-0 items-center rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface-elevated)]/90 px-3 text-xs font-semibold text-[var(--gn-text)] shadow-[var(--gn-shadow-sm)] transition hover:bg-[var(--gn-surface-hover)] disabled:pointer-events-none disabled:opacity-35"
                  onClick={() => setGifPickerOpen((o) => !o)}
                >
                  GIF
                </button>
              }
            />
            {gifPickerOpen && selfId && activeThreadId ? (
              <div className="mt-2 rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-3">
                <div className="flex flex-wrap gap-2">
                  <input
                    className="gn-input min-w-[12rem] flex-1 px-2 py-1.5 text-sm"
                    placeholder="Search Giphy…"
                    value={gifQuery}
                    aria-busy={gifLoading}
                    onChange={(e) => setGifQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void runGifSearch(gifQuery);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="rounded-full bg-[var(--gn-surface-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--gn-text)] ring-1 ring-[var(--gn-divide)] hover:bg-[var(--gn-surface-hover)]"
                    onClick={() => void runGifSearch(gifQuery)}
                  >
                    {gifLoading ? "…" : "Search now"}
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-[var(--gn-text-muted)]">
                  One GIF per message, and not with photos or videos. Powered by
                  Giphy. Results update as you type (after a short pause).
                </p>
                {!gifConfigured ? (
                  <p className="mt-2 text-xs text-[var(--gn-text-muted)]">
                    GIF search is not configured on this server. Ask an admin to
                    set GIPHY_API_KEY.
                  </p>
                ) : null}
                {gifConfigured &&
                !gifLoading &&
                gifItems.length === 0 &&
                debouncedGifQuery.trim().length < 2 ? (
                  <p className="mt-2 text-xs text-[var(--gn-text-muted)]">
                    Trending GIFs appear here. Type to search.
                  </p>
                ) : null}
                {gifItems.length > 0 ? (
                  <div
                    className="gn-scrollbar-themed gn-scrollbar-giphy mt-3 max-h-40 overflow-y-auto overscroll-contain rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)]/40 py-2 pl-1 pr-2"
                    role="region"
                    aria-label="Giphy search results"
                  >
                    <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {gifItems.map((g, gi) => (
                        <li key={g.id ?? `${g.url}-${gi}`}>
                          <button
                            type="button"
                            className="relative block w-full touch-manipulation overflow-hidden rounded-lg ring-1 ring-[var(--gn-divide)] hover:ring-[var(--gn-accent)]"
                            title={g.title}
                            onClick={() => addGifAttachment(g.url)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={g.preview}
                              alt=""
                              className="h-16 w-full object-cover sm:h-20"
                              loading="lazy"
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                    {gifConfigured && gifItems.length >= 12 ? (
                      <button
                        type="button"
                        className="mt-2 w-full rounded-lg py-2 text-xs font-semibold text-[var(--gn-accent)] ring-1 ring-[var(--gn-divide)] hover:bg-[var(--gn-surface-hover)] disabled:opacity-50"
                        disabled={gifLoading}
                        onClick={() => void runGifSearch(gifQuery, true)}
                      >
                        {gifLoading ? "Loading…" : "Load more GIFs"}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="mt-2 flex items-center gap-2">
              {/* Media attach button */}
              {!activeThreadId ||
              pendingAttachments.length >= DM_ATTACH_MAX ? (
                <span
                  className="flex h-9 w-9 shrink-0 cursor-not-allowed items-center justify-center rounded-full text-[var(--gn-text-muted)] opacity-40"
                  aria-disabled
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </span>
              ) : (
                <label
                  htmlFor={dmAttachInputId}
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--gn-text-muted)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-text)]"
                  title="Attach media"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="sr-only">Attach media</span>
                </label>
              )}
              {/* Pill text input */}
              <input
                className="flex-1 rounded-full border border-[var(--gn-divide)] bg-[var(--gn-surface-elevated)] px-4 py-2.5 text-sm text-[var(--gn-text)] placeholder:text-[var(--gn-text-muted)] focus:border-[var(--gn-accent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  activePeer
                    ? `Message ${displayNameFor(activePeer.id, selfId, activePeer)}…`
                    : "Select a conversation…"
                }
                disabled={!activeThreadId}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              {/* Circle send button */}
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--gn-accent)] text-black shadow-sm transition hover:brightness-110 disabled:opacity-40"
                disabled={(() => {
                  if (!activeThreadId) return true;
                  const uploading = pendingAttachments.some((a) => a.uploading);
                  const hasErr = pendingAttachments.some((a) => a.error);
                  const remotes = pendingAttachments.filter((a) => a.remoteUrl);
                  const incomplete =
                    pendingAttachments.length > 0 &&
                    remotes.length !== pendingAttachments.length;
                  if (uploading || hasErr || incomplete) return true;
                  return !draft.trim() && remotes.length === 0;
                })()}
                onClick={() => void sendMessage()}
                aria-label="Send message"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <details className="relative mt-2 inline-block">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-[var(--gn-text-muted)] hover:text-[var(--gn-text)] [&::-webkit-details-marker]:hidden">
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full border border-[var(--gn-divide)] text-[10px] font-bold leading-none"
                  aria-hidden
                >
                  i
                </span>
                Privacy info
              </summary>
              <div className="absolute bottom-6 left-0 z-20 w-72 rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-elevated)] p-3 text-xs leading-relaxed text-[var(--gn-text-muted)] shadow-[var(--gn-shadow-md)]">
                Private between you and the other person on GrowersNotebook,
                like typical app messages. Content is readable by the service
                when needed for safety and operations—not end-to-end encrypted
                from Growers (similar to default Messenger, not Signal-style
                encryption).
              </div>
            </details>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
