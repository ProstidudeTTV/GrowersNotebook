import Link from "next/link";
import { CommunityIcon } from "@/components/community-icon";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site-config";

const DISCORD_INVITE_URL = "https://discord.gg/qGvv9knhdA";

export type GuestLandingCommunity = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconKey?: string | null;
};

/** Lightweight projection of `/posts/hot/week` items used in the hero preview. */
export type GuestLandingHotPost = {
  id: string;
  title: string;
  /** First image attached to the post, when one exists. */
  imageUrl: string | null;
  /** Net vote score (upvotes - downvotes). */
  score: number;
  authorName: string;
  communityName: string | null;
};

function formatCount(count: number): string {
  if (!Number.isFinite(count) || count < 0) return "0";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count > 999) return `${(count / 1000).toFixed(1)}k`;
  return String(Math.round(count));
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconLeaf({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconBook({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function IconStar({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

/** Decorative hero-card gradients when a post has no hero image (not mock content). */
const CARD_GRADIENTS = [
  "from-[color-mix(in_srgb,var(--gn-accent)_45%,#0a1209)] to-[color-mix(in_srgb,var(--gn-accent)_20%,#070e06)]",
  "from-violet-800 to-purple-600",
  "from-amber-700 to-yellow-600",
  "from-teal-800 to-cyan-600",
  "from-rose-800 to-pink-600",
  "from-blue-800 to-indigo-600",
] as const;

function gradientForPost(postId: string): string {
  let h = 0;
  for (let i = 0; i < postId.length; i++) {
    h = (Math.imul(31, h) + postId.charCodeAt(i)) | 0;
  }
  return CARD_GRADIENTS[Math.abs(h) % CARD_GRADIENTS.length];
}

// ─── Preview grid card ─────────────────────────────────────────────────────────

function PreviewCard({
  gradient,
  title,
  author,
  community,
  score,
  imageUrl,
  href,
}: {
  gradient: string;
  title: string;
  author: string;
  community: string;
  score: number;
  imageUrl?: string | null;
  href?: string;
}) {
  const inner = (
    <div className="group relative overflow-hidden rounded-2xl border border-white/5 shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:border-[var(--gn-accent)]/30">
      {/* Gradient / image top */}
      <div className={`relative h-28 bg-gradient-to-br ${gradient} overflow-hidden`}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : null}
        {/* Score badge */}
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          <span className="text-[var(--gn-accent)]">↑</span>
          {score}
        </div>
      </div>
      {/* Text bottom */}
      <div className="bg-[var(--gn-surface-raised)] p-3">
        <p className="line-clamp-1 text-xs font-semibold text-[var(--gn-text)] leading-snug">
          {title}
        </p>
        <p className="mt-0.5 text-[10px] text-[var(--gn-text-muted)] truncate">
          {author} · <span className="text-[var(--gn-accent)]/80">{community}</span>
        </p>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

function GrowerSocialProof({ growerCount }: { growerCount: number }) {
  if (growerCount <= 0) return null;
  return (
    <p className="text-sm text-[var(--gn-text-muted)]">
      <span className="font-semibold text-[var(--gn-text)]">{formatCount(growerCount)}</span>{" "}
      {growerCount === 1 ? "grower" : "growers"} on the platform
    </p>
  );
}

// ─── Stats band ────────────────────────────────────────────────────────────────

function StatsBand({
  growersOnline,
  communityCount,
  postCount,
  growerCount,
}: {
  growersOnline: number;
  communityCount: number;
  postCount: number;
  growerCount: number;
}) {
  const stats: { value: string; label: string }[] = [];
  if (postCount > 0) {
    stats.push({ value: formatCount(postCount), label: postCount === 1 ? "Post" : "Posts" });
  }
  if (growerCount > 0) {
    stats.push({
      value: formatCount(growerCount),
      label: growerCount === 1 ? "Grower" : "Growers",
    });
  }
  if (communityCount > 0) {
    stats.push({
      value: formatCount(communityCount),
      label: communityCount === 1 ? "Community" : "Communities",
    });
  }
  if (growersOnline > 0) {
    stats.push({ value: formatCount(growersOnline), label: "Online now" });
  }
  stats.push({ value: "Free", label: "To join" });

  const cols = stats.length >= 4 ? 4 : Math.max(2, stats.length);

  return (
    <div className="border-y border-[var(--gn-divide)] bg-[var(--gn-surface-raised)]">
      <div className="mx-auto max-w-6xl px-4">
        <div
          className="grid divide-x divide-[var(--gn-divide)]"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center py-6 px-4 text-center">
              <span className="text-2xl font-black tabular-nums text-[var(--gn-accent)] sm:text-3xl">
                {s.value}
              </span>
              <span className="mt-1 text-xs text-[var(--gn-text-muted)] uppercase tracking-wider font-medium">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GuestLanding({
  communities,
  loadError,
  apiBase,
  hostedDeploy = false,
  heroBlurb = SITE_TAGLINE,
  growersOnline = 0,
  hotPosts = [],
  postCount = 0,
  growerCount = 0,
}: {
  communities: GuestLandingCommunity[];
  loadError: string | null;
  apiBase: string;
  /** Show Render/production troubleshooting instead of local npm hints */
  hostedDeploy?: boolean;
  /** Shown under the hero headline; defaults to code tagline, or pass admin meta description */
  heroBlurb?: string;
  /** Real "growers online now" count (last 15 min); rendered as `1.2k` when > 999. */
  growersOnline?: number;
  /** Top hot posts (last 7 days) from `GET /posts/hot/week` for the hero preview grid. */
  hotPosts?: GuestLandingHotPost[];
  /** From `GET /site/platform-stats`. */
  postCount?: number;
  growerCount?: number;
}) {
  const featured = communities.slice(0, 8);

  const previewCards = hotPosts.map((post) => ({
    key: post.id,
    gradient: gradientForPost(post.id),
    title: post.title,
    author: `u/${post.authorName}`,
    community: post.communityName?.trim() || "Growers",
    score: post.score,
    imageUrl: post.imageUrl,
    href: `/p/${post.id}`,
  }));

  return (
    <main className="relative min-w-0 overflow-x-hidden">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen items-center">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle,rgba(74,222,128,0.08),transparent_60%)] blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-[500px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(74,222,128,0.06),transparent_65%)] blur-3xl" />
          {/* Subtle dot grid */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='1' fill='%23ffffff'/%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:py-24 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">

            {/* Left: Headline + CTAs + Social proof */}
            <div className="min-w-0 space-y-6">
              {/* Tag */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gn-accent)]/25 bg-[var(--gn-accent)]/8 px-4 py-2 text-sm font-semibold text-[var(--gn-accent)]">
                <span>🌿</span>
                <span>Home cannabis grow community</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-[var(--gn-text)] sm:text-5xl lg:text-6xl">
                Grow.{" "}
                <span className="text-[var(--gn-text-muted)]">Share.</span>{" "}
                <span className="bg-gradient-to-r from-[var(--gn-accent)] to-[#86efac] bg-clip-text text-transparent">
                  Thrive.
                </span>
              </h1>

              {/* Description */}
              <p className="max-w-[500px] text-lg leading-relaxed text-[var(--gn-text-muted)]">
                Join a thriving community of home cannabis growers. Document every week of your grow
                in detailed notebooks, share harvests, and learn from experienced cultivators around
                the world.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--gn-accent)] px-7 py-3.5 text-sm font-bold text-[#0a1209] shadow-[0_0_30px_-4px_rgba(74,222,128,0.5)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gn-accent)]"
                >
                  Start Growing Free →
                </Link>
                <Link
                  href="/hot"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] px-7 py-3.5 text-sm font-semibold text-[var(--gn-text)] transition hover:border-[var(--gn-accent)]/30 hover:bg-[var(--gn-surface-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gn-accent)]"
                >
                  Browse the Community
                </Link>
              </div>

              {/* Social proof */}
              <GrowerSocialProof growerCount={growerCount} />

              {/* Discord subtle link */}
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--gn-text-muted)] transition hover:text-[#5865F2]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.02.01.04.028.052a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .028-.053c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                Chat with us on Discord ↗
              </a>
            </div>

            {/* Right: 2×3 preview card grid */}
            <div className="min-w-0">
              {/* LIVE badge */}
              <div className="mb-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--gn-accent)]/30 bg-[var(--gn-accent)]/8 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--gn-accent)]">
                  {previewCards.length > 0 ? (
                    <>
                      <span className="relative flex h-2 w-2" aria-hidden>
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--gn-accent)] opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--gn-accent)]" />
                      </span>
                      From the community
                    </>
                  ) : (
                    "Community feed"
                  )}
                </span>
                {growersOnline > 0 ? (
                  <span className="text-xs text-[var(--gn-text-muted)]">
                    <span className="font-semibold text-[var(--gn-text)]">
                      {formatCount(growersOnline)}
                    </span>{" "}
                    growers active now
                  </span>
                ) : null}
              </div>
              {previewCards.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {previewCards.map(({ key, ...card }) => (
                    <PreviewCard key={key} {...card} />
                  ))}
                </div>
              ) : (
                <Link
                  href="/hot"
                  className="flex min-h-[12rem] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--gn-divide)] bg-[var(--gn-surface-raised)]/60 p-6 text-center transition hover:border-[var(--gn-accent)]/35"
                >
                  <span className="text-3xl" aria-hidden>
                    🔥
                  </span>
                  <p className="mt-3 text-sm font-semibold text-[var(--gn-text)]">
                    No posts to preview yet
                  </p>
                  <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
                    Be the first to share a grow, or browse communities →
                  </p>
                </Link>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── Stats Band ────────────────────────────────────────────────────────── */}
      <StatsBand
        growersOnline={growersOnline}
        communityCount={communities.length}
        postCount={postCount}
        growerCount={growerCount}
      />

      {/* ── Why Growers Notebook ─────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-black tracking-tight text-[var(--gn-text)] sm:text-4xl">
              Why Growers Notebook?
            </h2>
            <p className="mt-3 text-[var(--gn-text-muted)]">
              Built by growers, for growers. No ads. No fluff.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <article className="group flex flex-col rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] p-7 shadow-sm transition-all duration-200 hover:border-[var(--gn-accent)]/30 hover:shadow-lg hover:translate-y-[-2px]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gn-accent)]/12 text-[var(--gn-accent)] transition group-hover:bg-[var(--gn-accent)]/20">
                <IconUsers className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-[var(--gn-text)]">
                Real communities
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--gn-text-muted)]">
                Topic-focused rooms for organics, LEDs, outdoor, breeders, and
                everything in between — with growers who actually run gardens.
              </p>
              <Link
                href="/community"
                className="mt-5 text-sm font-semibold text-[var(--gn-accent)] opacity-0 transition-opacity group-hover:opacity-100"
              >
                Explore communities →
              </Link>
            </article>

            <article className="group flex flex-col rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] p-7 shadow-sm transition-all duration-200 hover:border-[var(--gn-accent)]/30 hover:shadow-lg hover:translate-y-[-2px]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gn-accent)]/12 text-[var(--gn-accent)] transition group-hover:bg-[var(--gn-accent)]/20">
                <IconBook className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-[var(--gn-text)]">
                Grow notebooks
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--gn-text-muted)]">
                Log every week of your run — photos, notes, nutrients, VPD.
                Searchable, shareable, and readable years later.
              </p>
              <Link
                href="/login"
                className="mt-5 text-sm font-semibold text-[var(--gn-accent)] opacity-0 transition-opacity group-hover:opacity-100"
              >
                Start your notebook →
              </Link>
            </article>

            <article className="group flex flex-col rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] p-7 shadow-sm transition-all duration-200 hover:border-violet-500/30 hover:shadow-lg hover:translate-y-[-2px]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-600 transition group-hover:bg-violet-500/20 dark:text-violet-400">
                <IconStar className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-[var(--gn-text)]">
                Strain &amp; breeder intel
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--gn-text-muted)]">
                Explore the catalog, compare genetics, and read grow reviews
                from people who actually ran the phenos — not seed-shop copy.
              </p>
              <Link
                href="/strains"
                className="mt-5 text-sm font-semibold text-violet-400 opacity-0 transition-opacity group-hover:opacity-100"
              >
                Browse strains →
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* ── Explore communities ──────────────────────────────────────────────── */}
      <section id="explore" className="border-t border-[var(--gn-divide)] bg-[var(--gn-surface-muted)]/40 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-[var(--gn-text)] sm:text-4xl">
                Explore communities
              </h2>
              <p className="mt-2 max-w-md text-[var(--gn-text-muted)]">
                Peek at public rooms — sign in to subscribe, post, and message other growers.
              </p>
            </div>
            <Link
              href="/login"
              className="shrink-0 text-sm font-semibold text-[var(--gn-accent)] transition hover:opacity-80"
            >
              Create an account →
            </Link>
          </div>

          {loadError ? (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-6 text-amber-950 dark:border-amber-900/80 dark:bg-amber-950/35 dark:text-amber-100">
              <p className="font-semibold">Could not load communities</p>
              <p className="mt-2 text-sm opacity-90">{loadError}</p>
              {apiBase ? (
                <p className="mt-3 text-sm opacity-90">
                  API base:{" "}
                  <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                    {apiBase}
                  </code>
                </p>
              ) : null}
              {hostedDeploy ? (
                <ul className="mt-4 list-inside list-disc text-sm opacity-90">
                  <li>
                    On your <strong>hosted API</strong> service, open Logs and confirm the latest deploy
                    is live. Try{" "}
                    <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                      {apiBase}/health
                    </code>
                    .
                  </li>
                  <li>
                    If the API recently added catalog columns, run the migration on your hosted
                    Postgres database (e.g.{" "}
                    <code className="rounded bg-black/10 px-1 dark:bg-white/10">icon_key</code> on{" "}
                    <code className="rounded bg-black/10 px-1 dark:bg-white/10">communities</code>).
                  </li>
                </ul>
              ) : null}
            </div>
          ) : featured.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--gn-divide)] py-20 text-center">
              <div className="text-5xl mb-4">🌱</div>
              <p className="text-lg font-semibold text-[var(--gn-text)] mb-2">
                Communities are growing...
              </p>
              <p className="text-sm text-[var(--gn-text-muted)]">
                Check back soon — or be the first to start one.
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/community/${c.slug}`}
                    className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] shadow-sm transition-all duration-200 hover:border-[var(--gn-accent)]/35 hover:shadow-lg hover:translate-y-[-2px]"
                  >
                    {/* Top accent strip */}
                    <div className="h-2 w-full bg-gradient-to-r from-[var(--gn-accent)]/40 to-[var(--gn-accent)]/10 group-hover:from-[var(--gn-accent)]/70 transition-all duration-200" />

                    <div className="flex flex-col flex-1 p-5">
                      {/* Community icon */}
                      <CommunityIcon
                        iconKey={c.iconKey}
                        nameFallback={c.name}
                        slugFallback={c.slug}
                        frameClassName="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--gn-surface-elevated)] text-[var(--gn-text)] ring-1 ring-[var(--gn-divide)]"
                      />

                      <h3 className="mt-4 font-bold text-[var(--gn-text)] transition-colors group-hover:text-[var(--gn-accent)]">
                        {c.name}
                      </h3>

                      {c.description?.trim() ? (
                        <p className="mt-1.5 line-clamp-3 flex-1 text-sm leading-snug text-[var(--gn-text-muted)]">
                          {c.description.trim()}
                        </p>
                      ) : (
                        <p className="mt-1.5 flex-1 text-sm italic text-[var(--gn-text-muted)]/60">
                          Open the room →
                        </p>
                      )}

                      {/* Join button */}
                      <span className="mt-4 inline-flex w-fit items-center rounded-full bg-[var(--gn-accent)]/10 border border-[var(--gn-accent)]/25 px-3 py-1 text-xs font-semibold text-[var(--gn-accent)] opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:bg-[var(--gn-accent)]/15">
                        Join →
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 sm:py-28">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--gn-surface-raised)]/60 to-transparent" />
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(74,222,128,0.07),transparent_70%)] blur-3xl" />
        </div>

        <div className="mx-auto max-w-3xl px-4 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--gn-accent)]/15 text-[var(--gn-accent)] ring-1 ring-[var(--gn-accent)]/20">
            <IconLeaf className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-[var(--gn-text)] sm:text-4xl">
            Ready to document your best grow?
          </h2>
          <p className="mt-4 text-lg text-[var(--gn-text-muted)]">
            Free to join. Bring your garden, your questions, and your harvest photos.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-[var(--gn-accent)] px-10 py-4 text-sm font-bold text-[#0a1209] shadow-[0_0_40px_-8px_rgba(74,222,128,0.6)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gn-accent)]"
            >
              Get started — it&apos;s free
            </Link>
            <Link
              href="/strains"
              className="inline-flex items-center justify-center rounded-full border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] px-10 py-4 text-sm font-semibold text-[var(--gn-text)] transition hover:border-[var(--gn-accent)]/30 hover:bg-[var(--gn-surface-elevated)]"
            >
              Browse strains
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
