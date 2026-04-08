"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FeedPostCardList } from "@/components/feed-post-card-list";
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
    return (
      <p className="text-sm text-[var(--gn-text-muted)]" aria-live="polite">
        Loading…
      </p>
    );
  }

  if (signedIn === false) {
    return (
      <div className="gn-panel p-6 text-[var(--gn-text-muted)]">
        <p className="text-[var(--gn-text)]">
          Sign in to see posts from growers and communities you follow.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-full bg-[#ff4500] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ff5414]"
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
              ? "rounded-full bg-[#ff4500] px-3 py-1 text-white"
              : "rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-3 py-1 text-[var(--gn-text)] transition hover:shadow-[var(--gn-shadow-sm)]"
          }
        >
          New
        </Link>
        <Link
          href={sortLink("top")}
          className={
            sort === "top"
              ? "rounded-full bg-[#ff4500] px-3 py-1 text-white"
              : "rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-3 py-1 text-[var(--gn-text)] transition hover:shadow-[var(--gn-shadow-sm)]"
          }
        >
          Top
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--gn-text-muted)]">Loading posts…</p>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="gn-panel border-dashed p-8 text-center text-[var(--gn-text-muted)]">
          <p className="text-[var(--gn-text)]">Your feed is empty.</p>
          <p className="mt-2 text-sm">
            Follow other growers or join communities—then new posts appear
            here, similar to Reddit’s home feed.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-[#ff4500] hover:underline"
          >
            Browse communities
          </Link>
        </div>
      ) : (
        <FeedPostCardList items={items} />
      )}

      {!loading && total > PAGE_SIZE ? (
        <div className="mt-6 flex justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link
              className="text-[#ff4500] hover:underline"
              href={`/following?sort=${sort}&page=${page - 1}`}
            >
              Previous
            </Link>
          ) : null}
          {page * PAGE_SIZE < total ? (
            <Link
              className="text-[#ff4500] hover:underline"
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
