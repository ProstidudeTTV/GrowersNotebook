"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
 * Inline post composer prompt — Facebook / Reddit style.
 * Clicking any part navigates to the new-post form.
 */
export function PostComposerPrompt({
  communitySlug,
}: {
  /** When set, new posts go directly to that community's post form. */
  communitySlug?: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      setLoggedIn(true);
      const meta = session.user.user_metadata as Record<string, unknown>;
      setDisplayName((meta?.display_name as string) || null);
      setAvatarUrl((meta?.avatar_url as string) || null);
    });
  }, []);

  const postHref = communitySlug
    ? `/community/${communitySlug}/new`
    : "/new-post";

  const initial = ((displayName ?? "G").charAt(0) || "G").toUpperCase();
  const avatarBg = hashColor(displayName ?? "G");

  if (!loggedIn) {
    return (
      <div className="mb-4 flex items-center gap-3 overflow-hidden rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] px-4 py-3 shadow-[var(--gn-shadow-sm)]">
        <div className="h-9 w-9 shrink-0 rounded-full bg-[var(--gn-surface-elevated)] ring-1 ring-[var(--gn-ring)]" />
        <Link
          href="/login"
          className="flex-1 rounded-full border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-2 text-sm text-[var(--gn-text-muted)] transition hover:border-[var(--gn-accent)]/40 hover:text-[var(--gn-text)]"
        >
          Sign in to share your grow...
        </Link>
        <Link
          href="/login"
          className="shrink-0 rounded-full bg-[var(--gn-accent)] px-4 py-2 text-xs font-bold text-[var(--gn-on-accent)] transition hover:brightness-110"
        >
          Join
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] shadow-[var(--gn-shadow-sm)] transition hover:border-[var(--gn-accent)]/30">
      {/* Main row */}
      <div className="flex items-center gap-3 p-3">
        {/* Avatar */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-[var(--gn-on-accent)] ring-2 ring-white/10 ${avatarBg}`}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={36}
              height={36}
              className="h-full w-full object-cover"
              sizes="36px"
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>

        {/* Fake input — click goes to post form */}
        <button
          type="button"
          onClick={() => router.push(postHref)}
          className="flex-1 cursor-text rounded-full border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-2.5 text-left text-sm text-[var(--gn-text-muted)] transition hover:border-[var(--gn-accent)]/40 hover:bg-[var(--gn-surface-elevated)] hover:text-[var(--gn-text)]"
        >
          What&apos;s growing? Share with the community...
        </button>
      </div>

      {/* Quick-action row */}
      <div className="flex border-t border-[var(--gn-divide)]">
        <Link
          href={postHref}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-[var(--gn-text-muted)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-accent)]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          <span className="hidden sm:inline">Photo / Video</span>
          <span className="sm:hidden">Photo</span>
        </Link>

        <div className="w-px bg-[var(--gn-divide)]" />

        <Link
          href={postHref}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-[var(--gn-text-muted)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-accent)]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          <span className="hidden sm:inline">Text Post</span>
          <span className="sm:hidden">Text</span>
        </Link>

        <div className="w-px bg-[var(--gn-divide)]" />

        <Link
          href={postHref}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-[var(--gn-text-muted)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-accent)]"
        >
          <span aria-hidden>🌿</span>
          <span className="hidden sm:inline">Grow Update</span>
          <span className="sm:hidden">Update</span>
        </Link>

        <div className="w-px bg-[var(--gn-divide)]" />

        <Link
          href="/notebooks/new"
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-[var(--gn-text-muted)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-accent)]"
        >
          <span aria-hidden>📓</span>
          <span className="hidden sm:inline">Start Journal</span>
          <span className="sm:hidden">Journal</span>
        </Link>
      </div>
    </div>
  );
}
