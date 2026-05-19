"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
          className="mt-4 inline-block rounded-full bg-[#ff4500] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ff5414]"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Collapsed post composer strip — only shown to signed-in users */}
      <div
        className="gn-card flex items-center gap-3 px-4 py-3 mb-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => router.push("/new-post")}
      >
        <div className="h-9 w-9 rounded-full bg-[var(--gn-surface-2)] flex-shrink-0 overflow-hidden" />
        <div
          className="flex-1 rounded-full bg-[var(--gn-surface-2)] border border-[var(--gn-divide)] px-4 py-2 text-sm text-[var(--gn-text-3)]"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && router.push("/new-post")}
        >
          What&apos;s growing? Share your update...
        </div>
        <button
          className="text-[var(--gn-text-3)] hover:text-[var(--gn-accent)] transition-colors"
          aria-label="Add photo"
          onClick={(e) => {
            e.stopPropagation();
            router.push("/new-post");
          }}
        >
          📷
        </button>
      </div>

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
        <SkeletonFeedList />
      ) : loadError ? (
        <ApiErrorCard
          message="Could not load your following feed right now."
          onRetry={() => window.location.reload()}
        />
      ) : items.length === 0 ? (
        <div className="text-center py-12 gn-panel rounded-2xl">
          <div className="text-5xl mb-4">🌱</div>
          <h3 className="text-lg font-semibold text-[var(--gn-text-1)] mb-2">
            Your feed is empty
          </h3>
          <p className="text-sm text-[var(--gn-text-2)] mb-6 max-w-xs mx-auto">
            Follow some growers or join communities to see their posts here.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/community"
              className="inline-flex items-center gap-2 bg-[var(--gn-accent)] text-white rounded-full px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Browse Communities
            </Link>
            <Link
              href="/hot"
              className="inline-flex items-center gap-2 bg-[var(--gn-surface-2)] text-[var(--gn-text-1)] border border-[var(--gn-divide)] rounded-full px-5 py-2 text-sm font-medium hover:bg-[var(--gn-surface-3)] transition-colors"
            >
              See What&apos;s Hot
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
