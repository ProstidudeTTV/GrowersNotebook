"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-public";

type PostSnippet = { title: string };

export function DmSharedPostEmbed({ postId }: { postId: string }) {
  const [title, setTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await apiFetch<PostSnippet>(`/posts/${postId}`, {
          method: "GET",
        });
        if (!cancelled) setTitle(p.title?.trim() || null);
      } catch {
        if (!cancelled) setTitle(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  return (
    <Link
      href={`/p/${postId}`}
      prefetch={false}
      className="gn-dm-post-embed mt-2 block w-full max-w-full rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-4 py-3 shadow-[var(--gn-shadow-sm)] ring-1 ring-[var(--gn-ring)] transition hover:border-[color-mix(in_srgb,var(--gn-accent)_28%,var(--gn-border))] hover:bg-[var(--gn-surface-hover)] sm:max-w-md lg:max-w-lg"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--gn-text-muted)]">
        Post
      </p>
      <p className="mt-1 line-clamp-3 text-base font-medium leading-snug text-[var(--gn-text)] lg:text-lg">
        {loading ? "Loading…" : title ?? "View post"}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--gn-accent)]">Open →</p>
    </Link>
  );
}
