import Image from "next/image";
import Link from "next/link";
import { CommunityIcon } from "@/components/community-icon";
import { AuthorMetaBadges } from "@/components/author-meta-badges";
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

function HotPostCard({ post, rank }: { post: FeedPost; rank: number }) {
  const thumb = firstImage(post);
  const community = post.community;

  return (
    <Link
      href={`/p/${post.id}`}
      className="group flex h-full min-h-[11.5rem] flex-col overflow-hidden rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] shadow-[var(--gn-shadow-sm)] transition hover:border-[color-mix(in_srgb,var(--gn-accent)_35%,var(--gn-divide))] hover:shadow-[var(--gn-shadow-md)] sm:min-h-[12.5rem]"
    >
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-[var(--gn-surface-muted)]">
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            fill
            className="object-cover object-center transition duration-200 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-4xl opacity-35">
            🌿
          </span>
        )}
        <span className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--gn-accent)] text-sm font-bold text-[var(--gn-on-accent)] shadow-sm">
          {rank}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-[var(--gn-text)] group-hover:text-[var(--gn-accent)]">
          {post.title}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {community ? (
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--gn-surface-muted)] px-2 py-0.5 text-xs font-medium text-[var(--gn-text-muted)] ring-1 ring-[var(--gn-divide)]">
              <CommunityIcon
                iconKey={community.iconKey}
                iconUrl={community.iconUrl}
                nameFallback={community.name}
                slugFallback={community.slug}
                frameClassName="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full text-[9px]"
              />
              <span className="truncate">{community.name}</span>
            </span>
          ) : null}
          <span className="rounded-full bg-[color-mix(in_srgb,var(--gn-accent)_12%,transparent)] px-2 py-0.5 text-xs font-bold text-[var(--gn-accent)]">
            {post.score} seeds
          </span>
        </div>
        <p className="mt-auto pt-3 text-xs text-[var(--gn-text-muted)]">
          <span className="font-medium text-[var(--gn-text)]">
            {post.author.displayName?.trim() || "Grower"}
          </span>
          <AuthorMetaBadges
            growerLevel={post.author.growerLevel}
            role={post.author.role}
            compact
          />
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

/** Equal-height hot cards for `/hot` (read-only feed; no composer on page). */
export function HotWeekPageLeaderboard({ items }: { items: FeedPost[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-label="Hot posts">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((post, i) => (
          <li key={post.id} className="flex">
            <HotPostCard post={post} rank={i + 1} />
          </li>
        ))}
      </ul>
    </section>
  );
}
