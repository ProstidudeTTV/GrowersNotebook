import Image from "next/image";
import Link from "next/link";
import { CommunityIcon } from "@/components/community-icon";
import type { FeedPost } from "@/lib/feed-post";

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function firstImage(post: FeedPost): string | null {
  const m = post.media?.find((x) => x.type === "image");
  return m?.url?.trim() || null;
}

function HotPostRow({
  post,
  rank,
  featured = false,
}: {
  post: FeedPost;
  rank: number;
  featured?: boolean;
}) {
  const thumb = firstImage(post);
  const community = post.community;

  return (
    <Link
      href={`/p/${post.id}`}
      className={`group flex gap-3 rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] p-3 transition hover:border-[color-mix(in_srgb,var(--gn-accent)_35%,var(--gn-divide))] hover:shadow-[var(--gn-shadow-md)] ${
        featured ? "sm:p-4" : ""
      }`}
    >
      <div
        className={`relative shrink-0 overflow-hidden rounded-xl bg-[var(--gn-surface-muted)] ring-1 ring-[var(--gn-divide)] ${
          featured ? "h-28 w-28 sm:h-32 sm:w-32" : "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]"
        }`}
      >
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            fill
            className="object-cover object-center transition duration-200 group-hover:scale-105"
            sizes={featured ? "128px" : "72px"}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl opacity-40">
            🌿
          </span>
        )}
        <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-[var(--gn-accent)] text-xs font-bold text-[var(--gn-on-accent)] shadow-sm">
          {rank}
        </span>
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <h3
          className={`font-bold leading-snug text-[var(--gn-text)] group-hover:text-[var(--gn-accent)] ${
            featured ? "line-clamp-3 text-base sm:text-lg" : "line-clamp-2 text-sm"
          }`}
        >
          {post.title}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {community ? (
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--gn-surface-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--gn-text-muted)] ring-1 ring-[var(--gn-divide)]">
              <CommunityIcon
                iconKey={community.iconKey}
                iconUrl={community.iconUrl}
                nameFallback={community.name}
                slugFallback={community.slug}
                frameClassName="flex h-3.5 w-3.5 shrink-0 items-center justify-center overflow-hidden rounded-full text-[8px]"
              />
              <span className="truncate">{community.name}</span>
            </span>
          ) : null}
          <span className="rounded-full bg-[color-mix(in_srgb,var(--gn-accent)_12%,transparent)] px-2 py-0.5 text-[11px] font-bold text-[var(--gn-accent)]">
            {post.score} seeds
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--gn-text-muted)]">
          {post.author.displayName?.trim() || "Grower"}
          <span aria-hidden> · </span>
          {timeAgo(post.createdAt)}
          {typeof post.commentCount === "number" && post.commentCount > 0 ? (
            <>
              <span aria-hidden> · </span>
              {post.commentCount} comments
            </>
          ) : null}
        </p>
      </div>
    </Link>
  );
}

/** Ranked hot feed layout for `/hot` (podium + list). */
export function HotWeekPageLeaderboard({ items }: { items: FeedPost[] }) {
  if (items.length === 0) return null;

  const podium = items.slice(0, 3);
  const rest = items.slice(3);

  return (
    <div className="space-y-6">
      {podium.length > 0 ? (
        <section aria-label="Top posts">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--gn-text-muted)]">
            Top growers this period
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {podium.map((post, i) => (
              <li key={post.id}>
                <HotPostRow post={post} rank={i + 1} featured />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {rest.length > 0 ? (
        <section aria-label="More hot posts">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--gn-text-muted)]">
            More trending
          </h2>
          <ul className="space-y-2">
            {rest.map((post, i) => (
              <li key={post.id}>
                <HotPostRow post={post} rank={podium.length + i + 1} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
