import Link from "next/link";
import { UserProfileLink } from "@/components/user-profile-link";
import { VoteScoreReadonly } from "@/components/vote-score-rail";
import { DEFAULT_GROWER_RANK, formatSeeds } from "@/lib/grower-display";
import { formatFeedExcerpt } from "@/lib/feed-excerpt";
import type { FeedPost } from "@/lib/feed-post";

export function PostFeedList({ items }: { items: FeedPost[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="gn-panel divide-y divide-[var(--gn-divide)] overflow-hidden">
      {items.map((p) => (
        <li
          key={p.id}
          className={
            p.pinnedAt
              ? "gn-list-row flex min-w-0 items-stretch transition-colors ring-1 ring-amber-200/35 shadow-[inset_0_0_28px_rgba(250,204,21,0.07)] dark:ring-amber-400/22 dark:shadow-[inset_0_0_32px_rgba(234,179,8,0.06)]"
              : "gn-list-row flex min-w-0 items-stretch transition-colors"
          }
        >
          <div className="flex min-w-0 flex-1 items-stretch">
            <Link
              href={`/p/${p.id}`}
              className="flex shrink-0 items-stretch self-stretch"
              aria-label={`Open post: ${p.title}`}
            >
              <VoteScoreReadonly
                variant="feed"
                score={p.score}
                upvotes={p.upvotes}
                downvotes={p.downvotes}
              />
            </Link>
            <div className="min-w-0 flex-1 p-4 pl-3">
              <Link
                href={`/p/${p.id}`}
                className="block font-semibold leading-snug text-[var(--gn-text)] hover:text-[#ff4500]"
              >
                {p.title}
              </Link>
              {p.excerpt ? (
                <Link
                  href={`/p/${p.id}`}
                  className="mt-1 line-clamp-2 block min-w-0 max-w-full hyphens-auto break-words text-sm text-[var(--gn-text-excerpt)] [overflow-wrap:anywhere] hover:text-[var(--gn-text)]"
                >
                  {formatFeedExcerpt(p.excerpt)}
                </Link>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--gn-text-muted)]">
                {p.community ? (
                  <>
                    <Link
                      href={`/community/${p.community.slug}`}
                      className="font-semibold text-[#ff4500] hover:underline"
                    >
                      {p.community.name.trim() || p.community.slug}
                    </Link>
                    <span className="opacity-50" aria-hidden>
                      ·
                    </span>
                  </>
                ) : null}
                <UserProfileLink
                  userId={p.author.id}
                  className="font-medium text-[var(--gn-text)] transition hover:text-[#ff4500] hover:underline"
                >
                  {p.author.displayName ?? "member"}
                </UserProfileLink>
                <span> · </span>
                {p.author.growerLevel?.trim() || DEFAULT_GROWER_RANK}
                <span> · </span>
                {formatSeeds(p.author.seeds)} seeds
                <span> · </span>
                {new Date(p.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
