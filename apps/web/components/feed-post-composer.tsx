"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { loginHref } from "@/lib/login-return-path";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PostComposer } from "@/components/post-composer";
import { PostComposerLeaveDialog } from "@/components/post-composer-leave-dialog";
import { apiFetch } from "@/lib/api-public";
import type { PostMediaItem } from "@/lib/feed-post";
import {
  bodyHtmlIsSubmittable,
  emptyTipTapDoc,
} from "@/lib/post-draft-validation";
import { draftHasContent } from "@/lib/post-composer-draft-storage";
import { useComposerNavigationGuard } from "@/lib/use-composer-navigation-guard";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

type JoinedCommunity = {
  id: string;
  slug: string;
  name: string;
};

const AVATAR_COLORS = [
  "bg-[var(--gn-accent)]",
  "bg-violet-700",
  "bg-amber-600",
  "bg-teal-700",
  "bg-rose-700",
  "bg-blue-700",
];

function hashColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/**
 * Facebook-style inline feed composer: expands in place with letterbox chrome,
 * blocks nav while open, and keeps draft in memory for this page only.
 */
export function FeedPostComposer({
  communitySlug: lockedCommunitySlug,
  communityId: lockedCommunityId,
  communityName: lockedCommunityName,
}: {
  communitySlug?: string;
  communityId?: string;
  communityName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [joined, setJoined] = useState<JoinedCommunity[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [media, setMedia] = useState<PostMediaItem[]>([]);
  const [draft, setDraft] = useState<{
    json: Record<string, unknown>;
    html: string;
  } | null>(null);
  const [communitySlug, setCommunitySlug] = useState<string | null>(
    lockedCommunitySlug ?? null,
  );
  const [editorKey, setEditorKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { leaveDialogOpen, dismissLeaveDialog, confirmLeave } =
    useComposerNavigationGuard({
      active: expanded,
      composerRootRef: overlayRef,
    });

  const effectiveSlug = lockedCommunitySlug ?? communitySlug;
  const communityId = useMemo(() => {
    if (lockedCommunityId) return lockedCommunityId;
    if (!effectiveSlug) return undefined;
    return joined.find((c) => c.slug === effectiveSlug)?.id;
  }, [lockedCommunityId, effectiveSlug, joined]);

  const communityLabel = useMemo(() => {
    if (lockedCommunityName) return lockedCommunityName;
    if (!effectiveSlug) return "Your profile";
    return joined.find((c) => c.slug === effectiveSlug)?.name ?? effectiveSlug;
  }, [lockedCommunityName, effectiveSlug, joined]);

  const hasDraft = useMemo(() => {
    return draftHasContent({
      title,
      media,
      bodyJson: draft?.json ?? { ...emptyTipTapDoc },
      bodyHtml: draft?.html ?? "",
      communitySlug: effectiveSlug,
      expanded,
      updatedAt: 0,
    });
  }, [title, media, draft, effectiveSlug, expanded]);

  const resetDraft = useCallback(() => {
    setTitle("");
    setMedia([]);
    setDraft(null);
    setEditorKey((k) => k + 1);
    setExpanded(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        setLoggedIn(false);
        return;
      }
      setLoggedIn(true);
      const meta = session.user.user_metadata as Record<string, unknown>;
      setDisplayName((meta?.display_name as string) || null);
      setAvatarUrl((meta?.avatar_url as string) || null);
      const token = await getAccessTokenForApi(supabase);
      if (token) {
        try {
          const list = await apiFetch<JoinedCommunity[]>(
            "/communities/me/following",
            { token },
          );
          setJoined(Array.isArray(list) ? list : []);
        } catch {
          setJoined([]);
        }
      }
    });
  }, []);

  const expand = () => setExpanded(true);

  const onMediaReady = useCallback((url: string, kind: "image" | "video") => {
    setError(null);
    setMedia((prev) => {
      if (prev.some((m) => m.url === url)) return prev;
      return [...prev, { url, type: kind }];
    });
  }, []);

  const setDraftStable = useCallback(
    (p: { json: Record<string, unknown>; html: string }) => {
      setDraft(p);
    },
    [],
  );

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) {
        setError("Sign in to post.");
        return;
      }

      const bodyHtml = draft?.html ?? "";
      const bodyJson = draft?.json ?? { ...emptyTipTapDoc };

      if (!bodyHtmlIsSubmittable(bodyHtml, media.length)) {
        setError("Add a caption or at least one photo or video.");
        return;
      }

      const post = await apiFetch<{ id: string }>("/posts", {
        method: "POST",
        token,
        body: JSON.stringify({
          ...(communityId ? { communityId } : {}),
          ...(title.trim() ? { title: title.trim() } : {}),
          bodyJson,
          bodyHtml,
          ...(media.length ? { media } : {}),
        }),
      });

      resetDraft();
      toast.success("Post published!");
      router.push(`/p/${post.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to publish");
    } finally {
      setLoading(false);
    }
  };

  const initial = ((displayName ?? "G").charAt(0) || "G").toUpperCase();
  const avatarBg = hashColor(displayName ?? "G");

  if (!loggedIn) {
    return (
      <div className="mb-4 flex items-center gap-3 overflow-hidden rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] px-4 py-3 shadow-[var(--gn-shadow-sm)]">
        <div className="h-9 w-9 shrink-0 rounded-full bg-[var(--gn-surface-elevated)] ring-1 ring-[var(--gn-ring)]" />
        <a
          href={loginHref(pathname, searchParams.toString() || undefined)}
          className="flex-1 rounded-full border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-2 text-sm text-[var(--gn-text-muted)] transition hover:border-[var(--gn-accent)]/40 hover:text-[var(--gn-text)]"
        >
          Sign in to share your grow…
        </a>
      </div>
    );
  }

  const collapsedCard = (
    <div
      ref={panelRef}
      className="mb-4 overflow-hidden rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] shadow-[var(--gn-shadow-sm)]"
    >
      <div className="flex items-center gap-3 border-b border-[var(--gn-divide)] p-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-[var(--gn-on-accent)] ring-2 ring-[var(--gn-surface-raised)] ${avatarBg}`}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={40}
              height={40}
              className="h-full w-full object-cover"
              sizes="40px"
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <button
          type="button"
          onClick={expand}
          className="flex-1 cursor-text rounded-full border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-2.5 text-left text-sm text-[var(--gn-text-muted)] transition hover:border-[var(--gn-accent)]/40 hover:bg-[var(--gn-surface-elevated)]"
        >
          What&apos;s growing? Share photos, updates, or questions…
        </button>
      </div>
      <div className="flex border-t border-[var(--gn-divide)]">
        <button
          type="button"
          onClick={expand}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-[var(--gn-text-muted)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-accent)]"
        >
          <span aria-hidden>📷</span>
          Photo / video
        </button>
        <div className="w-px bg-[var(--gn-divide)]" />
        <button
          type="button"
          onClick={expand}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-[var(--gn-text-muted)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-accent)]"
        >
          <span aria-hidden>✏️</span>
          Write update
        </button>
      </div>
    </div>
  );

  if (!expanded) {
    return (
      <>
        {collapsedCard}
        <PostComposerLeaveDialog
          open={leaveDialogOpen}
          onStay={dismissLeaveDialog}
          onLeave={() => confirmLeave(() => {})}
        />
      </>
    );
  }

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[110] flex min-h-0 flex-col items-center justify-center bg-[color-mix(in_srgb,var(--gn-page-mid)_88%,transparent)] p-0 backdrop-blur-sm sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Create post"
      >
        <div className="flex min-h-0 max-h-dvh w-full max-w-2xl flex-col overflow-hidden rounded-none border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] shadow-[var(--gn-shadow-md)] sm:max-h-[min(92dvh,900px)] sm:rounded-2xl">
          <div className="flex items-center gap-3 border-b border-[var(--gn-divide)] px-4 py-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-[var(--gn-on-accent)] ${avatarBg}`}
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                  sizes="40px"
                />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--gn-text)]">
                Create post
              </p>
              <p className="truncate text-xs text-[var(--gn-text-muted)]">
                Posting to{" "}
                <span className="font-medium text-[var(--gn-accent)]">
                  {communityLabel}
                </span>
              </p>
            </div>
            {!lockedCommunitySlug ? (
              <select
                className="gn-input max-w-[11rem] shrink-0 text-xs"
                value={communitySlug ?? ""}
                disabled={loading}
                aria-label="Community"
                onChange={(e) => {
                  const v = e.target.value;
                  setCommunitySlug(v === "" ? null : v);
                }}
              >
                <option value="">Your profile</option>
                {joined.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (hasDraft) {
                  resetDraft();
                } else {
                  setExpanded(false);
                }
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--gn-text-muted)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-text)]"
              aria-label="Close composer"
            >
              ✕
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <PostComposer
              title={title}
              onTitleChange={setTitle}
              titleOptional
              media={media}
              onMediaChange={setMedia}
              onMediaReady={onMediaReady}
              initialJson={draft?.json}
              editorKey={editorKey}
              onDraftChange={setDraftStable}
              disabled={loading}
              onError={setError}
            />

            {error ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--gn-divide)] bg-[var(--gn-surface-muted)]/50 px-4 py-3">
            <p className="text-xs text-[var(--gn-text-muted)]">
              Draft stays in this tab until you post
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  if (hasDraft) {
                    resetDraft();
                  } else {
                    setExpanded(false);
                  }
                }}
                className="rounded-full border border-[var(--gn-border)] px-4 py-2 text-sm font-medium text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void submit()}
                className="rounded-full bg-[var(--gn-accent)] px-5 py-2 text-sm font-bold text-[var(--gn-on-accent)] shadow-sm transition hover:brightness-110 disabled:opacity-50"
              >
                {loading ? "Publishing…" : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <PostComposerLeaveDialog
        open={leaveDialogOpen}
        onStay={dismissLeaveDialog}
        onLeave={() => confirmLeave(resetDraft)}
      />
    </>
  );
}
