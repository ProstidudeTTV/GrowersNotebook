"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiErrorCard } from "@/components/api-error-card";
import { FeedPostCardList } from "@/components/feed-post-card-list";
import { SkeletonFeedList } from "@/components/skeletons";
import { apiFetch } from "@/lib/api-public";
import type { FeedPost } from "@/lib/feed-post";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

const PAGE_SIZE = 20;

type FeedResponse = {
  items: FeedPost[];
  total: number;
  page: number;
  pageSize: number;
};

export function FollowingFeed({
  sort: initialSort,
  page: initialPage,
}: {
  sort: "new" | "top";
  page: number;
}) {
  const [items, setItems] = useState<FeedPost[]>([]);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setSort(initialSort);
    setPage(initialPage);
  }, [initialSort, initialPage]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSignedIn(!!session?.user);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
      setPage(1);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (signedIn === null) return;

    if (signedIn === false) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const supabase = createClient();
        const token = await getAccessTokenForApi(supabase);
        const qs = new URLSearchParams({
          sort,
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        const feed = await apiFetch<FeedResponse>(
          `/posts/following?${qs.toString()}`,
          { token: token ?? undefined },
        );
        if (!cancelled) {
          setItems(feed.items);
          setTotal(feed.total);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, sort, page]);

  const sortLink = (s: "new" | "top") => {
    const p = new URLSearchParams({ sort: s, page: "1" });
    return `/following?${p.toString()}`;
  };

  if (signedIn === null) {
    return <SkeletonFeedList />;
  }

  if (signedIn === false) {
    return (
      <div className="gn-panel p-6 text-[var(--gn-text-muted)]">
        <p className="text-[var(--gn-text)]">
          Sign in to see posts from growers and communities you follow.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-full bg-[var(--gn-accent)] px-4 py-2 text-sm font-semibold text-[var(--gn-on-accent)] hover:brightness-110"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex gap-2 text-sm font-medium">
        <Link
          href={sortLink("new")}
          className={
            sort === "new"
              ? "rounded-full bg-[var(--gn-accent)] px-3 py-1 text-[var(--gn-on-accent)]"
              : "rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-3 py-1 text-[var(--gn-text)] transition hover:shadow-[var(--gn-shadow-sm)]"
          }
        >
          New
        </Link>
        <Link
          href={sortLink("top")}
          className={
            sort === "top"
              ? "rounded-full bg-[var(--gn-accent)] px-3 py-1 text-[var(--gn-on-accent)]"
              : "rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-3 py-1 text-[var(--gn-text)] transition hover:shadow-[var(--gn-shadow-sm)]"
          }
        >
          Top
        </Link>
      </div>

      {loading ? (
        <SkeletonFeedList />
      ) : loadError ? (
        <ApiErrorCard
          message="Could not load your following feed right now."
          onRetry={() => window.location.reload()}
        />
      ) : items.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)]">
          {/* Gradient banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[color-mix(in_srgb,var(--gn-accent)_35%,var(--gn-page-top))] via-[var(--gn-surface-muted)] to-[var(--gn-page-bot)] px-6 py-10 text-center">
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[var(--gn-accent)]/10 blur-2xl" />
            <div className="relative">
              <div className="mb-3 text-5xl">🌿</div>
              <h3 className="text-xl font-extrabold tracking-tight text-white">
                Your feed is waiting
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-white/70">
                Follow communities to build your personalized grow feed.
              </p>
            </div>
          </div>
          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 px-6 py-5">
            <Link
              href="/community"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--gn-accent)] px-5 py-2.5 text-sm font-bold text-[var(--gn-on-accent)] shadow-sm transition hover:brightness-110"
            >
              🌿 Discover Communities
            </Link>
            <Link
              href="/hot"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)]"
            >
              🔥 What&apos;s Hot
            </Link>
          </div>
        </div>
      ) : (
        <FeedPostCardList items={items} />
      )}

      {!loading && total > PAGE_SIZE ? (
        <div className="mt-6 flex justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link
              className="text-[var(--gn-accent)] hover:underline"
              href={`/following?sort=${sort}&page=${page - 1}`}
            >
              Previous
            </Link>
          ) : null}
          {page * PAGE_SIZE < total ? (
            <Link
              className="text-[var(--gn-accent)] hover:underline"
              href={`/following?sort=${sort}&page=${page + 1}`}
            >
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
