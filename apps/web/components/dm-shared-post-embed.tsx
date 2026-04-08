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
      className="mt-2 block max-w-[min(100%,20rem)] rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-3 py-2.5 shadow-[var(--gn-shadow-sm)] ring-1 ring-black/5 transition hover:border-[color-mix(in_srgb,var(--gn-accent)_28%,var(--gn-border))] hover:bg-[var(--gn-surface-hover)] dark:ring-white/8"
    >
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
        Post
      </p>
      <p className="mt-1 line-clamp-3 text-sm font-medium leading-snug text-[var(--gn-text)]">
        {loading ? "Loading…" : title ?? "View post"}
      </p>
      <p className="mt-1.5 text-xs font-medium text-[#ff6a38]">Open →</p>
    </Link>
  );
}
