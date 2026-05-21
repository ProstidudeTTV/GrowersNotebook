import Image from "next/image";
import Link from "next/link";
import { CommunityIcon } from "@/components/community-icon";

export type HotWeekPost = {
  id: string;
  title: string;
  score?: number | null;
  commentCount?: number | null;
  createdAt?: string;
  media?: { url: string; type: string }[] | null;
  author?: { displayName?: string | null } | null;
  community?: {
    slug?: string | null;
    name?: string | null;
    iconKey?: string | null;
    iconUrl?: string | null;
  } | null;
};

function timeAgo(iso: string | undefined): string {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Sidebar "Hot this week" — photo-led ranked cards (GrowDiaries / Reddit hybrid).
 */
export function HotWeekSidebarPanel({ posts }: { posts: HotWeekPost[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] shadow-[var(--gn-shadow-sm)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--gn-divide)] bg-[color-mix(in_srgb,var(--gn-hot)_8%,var(--gn-surface-muted))] px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--gn-hot)_18%,transparent)] text-sm"
            aria-hidden
          >
            🔥
          </span>
          <div>
            <h2 className="text-sm font-bold text-[var(--gn-text)]">
              Hot this week
            </h2>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--gn-text-muted)]">
              Top seeds · last 7 days
            </p>
          </div>
        </div>
        <Link
          href="/hot"
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-[var(--gn-accent)] ring-1 ring-[var(--gn-accent)]/30 transition hover:bg-[var(--gn-accent)]/10"
        >
          See all
        </Link>
      </div>
      <ul className="divide-y divide-[var(--gn-divide)] p-2">
        {posts.map((p, i) => {
          const images =
            p.media?.filter((m) => m.type === "image").map((m) => m.url) ?? [];
          const thumb = images[0];
          const multi = images.length > 1;
          return (
            <li key={p.id}>
              <Link
                href={`/p/${p.id}`}
                className="group flex gap-3 rounded-xl p-2 transition hover:bg-[var(--gn-surface-hover)]"
              >
                <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-[var(--gn-surface-muted)] ring-1 ring-[var(--gn-divide)]">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt=""
                      fill
                      className="object-cover object-center transition duration-200 group-hover:scale-105"
                      sizes="72px"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-2xl opacity-50">
                      🌿
                    </span>
                  )}
                  {multi ? (
                    <span className="absolute bottom-1 right-1 rounded-md bg-black/65 px-1 py-0.5 text-[10px] font-bold text-white">
                      +{images.length - 1}
                    </span>
                  ) : null}
                  <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-md bg-[var(--gn-accent)] text-[10px] font-bold text-[var(--gn-on-accent)] shadow-sm">
                    {i + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="line-clamp-2 text-xs font-bold leading-snug text-[var(--gn-text)] group-hover:text-[var(--gn-accent)]">
                    {p.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {p.community?.slug ? (
                      <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--gn-surface-elevated)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--gn-text-muted)] ring-1 ring-[var(--gn-divide)]">
                        <CommunityIcon
                          iconKey={p.community.iconKey}
                          iconUrl={p.community.iconUrl}
                          nameFallback={p.community.name ?? p.community.slug}
                          slugFallback={p.community.slug}
                          frameClassName="flex h-3.5 w-3.5 shrink-0 items-center justify-center overflow-hidden rounded-full text-[8px]"
                        />
                        <span className="truncate">
                          {p.community.name ?? p.community.slug}
                        </span>
                      </span>
                    ) : null}
                    {p.score != null ? (
                      <span className="rounded-full bg-[color-mix(in_srgb,var(--gn-accent)_12%,transparent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--gn-accent)]">
                        {p.score} seeds
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[10px] text-[var(--gn-text-muted)]">
                    {p.author?.displayName?.trim() || "Grower"}
                    {p.createdAt ? (
                      <>
                        {" · "}
                        {timeAgo(p.createdAt)}
                      </>
                    ) : null}
                    {typeof p.commentCount === "number" && p.commentCount > 0 ? (
                      <>
                        {" · "}
                        {p.commentCount} comments
                      </>
                    ) : null}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
