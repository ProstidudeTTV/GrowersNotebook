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

// ─── Photo grid cell ──────────────────────────────────────────────────────────

const PLACEHOLDER_GRADIENTS = [
  "from-emerald-900/70 via-emerald-700/40 to-emerald-500/20",
  "from-orange-900/60 via-amber-700/40 to-yellow-500/20",
  "from-green-900/70 via-green-700/40 to-lime-400/20",
  "from-teal-900/70 via-teal-700/40 to-cyan-400/20",
  "from-stone-900/80 via-stone-700/50 to-amber-600/20",
  "from-emerald-950/80 via-green-800/50 to-emerald-500/20",
];

const PLACEHOLDER_LABELS = [
  { emoji: "🌿", title: "Week 6 frost incoming", author: "A grower" },
  { emoji: "🍁", title: "Harvest day finally arrived", author: "A grower" },
  { emoji: "🌱", title: "Seedlings under LED", author: "A grower" },
  { emoji: "🌾", title: "Living soil first run", author: "A grower" },
  { emoji: "🌿", title: "Outdoor monster crop", author: "A grower" },
  { emoji: "🍀", title: "Terpene deep dive notes", author: "A grower" },
];

type PhotoCardData = {
  id: string;
  href: string;
  imageUrl: string | null;
  title: string;
  author: string;
  community: string | null;
  placeholderIndex: number;
};

function PhotoCard({ card, tall = false }: { card: PhotoCardData; tall?: boolean }) {
  const ph = PLACEHOLDER_LABELS[card.placeholderIndex % PLACEHOLDER_LABELS.length];
  const grad = PLACEHOLDER_GRADIENTS[card.placeholderIndex % PLACEHOLDER_GRADIENTS.length];

  return (
    <Link
      href={card.href}
      className={`group relative block overflow-hidden rounded-2xl shadow-lg ${tall ? "row-span-2" : ""}`}
    >
      {card.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.imageUrl}
          alt={card.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className={`absolute inset-0 bg-gradient-to-br ${grad} flex items-center justify-center text-5xl`}
        >
          {ph.emoji}
        </div>
      )}

      {/* Bottom overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 pt-8">
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-white drop-shadow">
          {card.title || ph.title}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-white/70">
          {card.author}
          {card.community ? (
            <span className="text-[var(--gn-accent)]/90"> · {card.community}</span>
          ) : null}
        </p>
      </div>

      {/* Hover ring */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/10 transition group-hover:ring-[var(--gn-accent)]/50" />
    </Link>
  );
}

// ─── Hero photo mosaic ────────────────────────────────────────────────────────

function HeroPhotoMosaic({
  hotPosts,
  growersOnline,
}: {
  hotPosts: GuestLandingHotPost[];
  growersOnline: number;
}) {
  // Build 6 card slots — fill with real posts where we have them
  const cards: PhotoCardData[] = Array.from({ length: 6 }, (_, i) => {
    const post = hotPosts[i];
    if (post) {
      return {
        id: post.id,
        href: `/p/${post.id}`,
        imageUrl: post.imageUrl,
        title: post.title,
        author: post.authorName,
        community: post.communityName,
        placeholderIndex: i,
      };
    }
    return {
      id: `placeholder-${i}`,
      href: "/hot",
      imageUrl: null,
      title: PLACEHOLDER_LABELS[i % PLACEHOLDER_LABELS.length].title,
      author: PLACEHOLDER_LABELS[i % PLACEHOLDER_LABELS.length].author,
      community: null,
      placeholderIndex: i,
    };
  });

  return (
    <div className="relative">
      {/* LIVE badge */}
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Live
        </span>
        {growersOnline > 0 ? (
          <span className="text-xs text-[var(--gn-text-muted)]">
            <span className="font-semibold text-[var(--gn-text)]">
              {formatCount(growersOnline)}
            </span>{" "}
            growers online now
          </span>
        ) : null}
      </div>

      {/* Mosaic grid: first card is tall (row-span-2), then 4 regular, then 1 more */}
      {/* Layout: [tall | r1c1 | r1c2] [tall | r2c1 | r2c2] */}
      <div className="grid grid-cols-3 grid-rows-2 gap-2" style={{ height: "420px" }}>
        <PhotoCard card={cards[0]} tall />
        <PhotoCard card={cards[1]} />
        <PhotoCard card={cards[2]} />
        <PhotoCard card={cards[3]} />
        <PhotoCard card={cards[4]} />
        <PhotoCard card={cards[5]} />
      </div>
    </div>
  );
}

// ─── Stat bar ────────────────────────────────────────────────────────────────

function StatBar({
  growersOnline,
  communityCount,
}: {
  growersOnline: number;
  communityCount: number;
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold tabular-nums text-[var(--gn-accent)]">
          {formatCount(growersOnline)}
        </span>
        <span className="text-sm text-[var(--gn-text-muted)]">growers online</span>
      </div>
      <div className="h-4 w-px bg-[var(--gn-divide)]" aria-hidden />
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold tabular-nums text-[var(--gn-text)]">
          {communityCount > 0 ? `${communityCount}+` : "30+"}
        </span>
        <span className="text-sm text-[var(--gn-text-muted)]">communities</span>
      </div>
      <div className="h-4 w-px bg-[var(--gn-divide)]" aria-hidden />
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold tabular-nums text-[var(--gn-text)]">100%</span>
        <span className="text-sm text-[var(--gn-text-muted)]">free to join</span>
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
  /** Top hot posts (last 7 days) to render in the hero preview; empty array falls back to mock. */
  hotPosts?: GuestLandingHotPost[];
}) {
  const featured = communities.slice(0, 8);

  return (
    <main className="relative min-w-0 overflow-x-hidden">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[85vh] items-center">
        {/* Warm amber glow top-right, green accent bottom-left */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(251,146,60,0.18),transparent_65%)] blur-3xl" />
          <div className="absolute -bottom-24 left-0 h-[400px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.10),transparent_65%)] blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">

            {/* Left: Headline + CTAs + Stat bar */}
            <div className="min-w-0">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gn-text-muted)]">
                Welcome to {SITE_NAME}
              </p>

              <h1 className="text-4xl font-black leading-[1.06] tracking-tight text-[var(--gn-text)] sm:text-5xl lg:text-[3.5rem]">
                The grow journal{" "}
                <span className="relative whitespace-nowrap">
                  <span className="relative bg-gradient-to-r from-[var(--gn-accent)] via-[var(--gn-accent)] to-[#86efac] bg-clip-text text-transparent">
                    you&apos;ve been missing.
                  </span>
                </span>
              </h1>

              <p className="mt-5 max-w-[480px] text-lg leading-relaxed text-[var(--gn-text-muted)]">
                {heroBlurb}
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--gn-accent)] px-7 py-3.5 text-sm font-bold text-white shadow-[0_8px_30px_-8px_rgba(255,90,40,0.5)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gn-accent)]"
                >
                  Join the community
                </Link>
                <Link
                  href="/hot"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)]/60 px-7 py-3.5 text-sm font-semibold text-[var(--gn-text)] backdrop-blur-sm transition hover:border-[var(--gn-accent)]/30 hover:bg-[var(--gn-surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gn-accent)]"
                >
                  Browse posts
                </Link>
                <a
                  href={DISCORD_INVITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-3.5 text-sm font-medium text-[var(--gn-text-muted)] transition hover:text-[#5865F2]"
                >
                  Discord ↗
                </a>
              </div>

              {/* Stat bar */}
              <StatBar growersOnline={growersOnline} communityCount={communities.length} />
            </div>

            {/* Right: Photo mosaic */}
            <div className="min-w-0">
              <HeroPhotoMosaic hotPosts={hotPosts} growersOnline={0} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Growers Notebook ─────────────────────────────────────────────── */}
      <section className="border-y border-[var(--gn-divide)] bg-[color-mix(in_srgb,var(--gn-surface-muted)_60%,transparent)] py-16 backdrop-blur-[2px]">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--gn-text)] sm:text-3xl">
              Why Growers Notebook?
            </h2>
            <p className="mt-2 text-[var(--gn-text-muted)]">
              Built by growers, for growers. No ads. No fluff.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <article className="group rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)]/70 p-7 shadow-sm transition hover:border-[var(--gn-accent)]/25 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gn-accent)]/12 text-[var(--gn-accent)] transition group-hover:bg-[var(--gn-accent)]/20">
                <IconUsers className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-[var(--gn-text)]">
                Real communities
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--gn-text-muted)]">
                Topic-focused rooms for organics, LEDs, outdoor, breeders, and
                everything in between — with growers who actually run gardens.
              </p>
            </article>

            <article className="group rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)]/70 p-7 shadow-sm transition hover:border-emerald-500/25 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600 transition group-hover:bg-emerald-500/20 dark:text-emerald-400">
                <IconBook className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-[var(--gn-text)]">
                Grow notebooks
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--gn-text-muted)]">
                Log every week of your run — photos, notes, nutrients, VPD.
                Searchable, shareable, and readable years later.
              </p>
            </article>

            <article className="group rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)]/70 p-7 shadow-sm transition hover:border-violet-500/25 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-600 transition group-hover:bg-violet-500/20 dark:text-violet-400">
                <IconStar className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-[var(--gn-text)]">
                Strain &amp; breeder intel
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--gn-text-muted)]">
                Explore the catalog, compare genetics, and read grow reviews
                from people who actually ran the phenos — not seed-shop copy.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ── Explore communities ──────────────────────────────────────────────── */}
      <section id="explore" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--gn-text)] sm:text-3xl">
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
          <p className="rounded-2xl border border-dashed border-[var(--gn-divide)] py-14 text-center text-sm text-[var(--gn-text-muted)]">
            No communities yet — check back soon.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/community/${c.slug}`}
                  className="group relative flex h-full flex-col rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)]/55 p-5 shadow-sm transition-all duration-200 hover:border-[var(--gn-accent)]/35 hover:bg-[var(--gn-surface-muted)] hover:shadow-md"
                >
                  {/* Community icon */}
                  <CommunityIcon
                    iconKey={c.iconKey}
                    nameFallback={c.name}
                    slugFallback={c.slug}
                    frameClassName="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--gn-surface-muted)_85%,transparent)] text-[var(--gn-text)] ring-1 ring-[var(--gn-divide)]"
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

                  {/* Join pill — appears on hover */}
                  <span className="mt-4 inline-flex w-fit items-center rounded-full border border-[var(--gn-accent)]/30 px-3 py-1 text-xs font-semibold text-[var(--gn-accent)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    Join →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────────── */}
      <section className="border-t border-[var(--gn-divide)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--gn-surface-muted)_60%,transparent),transparent)] py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gn-accent)]/12 text-[var(--gn-accent)]">
            <IconLeaf className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-[var(--gn-text)] sm:text-3xl">
            Ready to grow together?
          </h2>
          <p className="mt-3 text-[var(--gn-text-muted)]">
            Free to join. Bring your garden, your questions, and your harvest photos.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-[var(--gn-accent)] px-9 py-4 text-sm font-bold text-white transition hover:brightness-110"
            >
              Get started — it&apos;s free
            </Link>
            <Link
              href="/strains"
              className="inline-flex items-center justify-center rounded-full border border-[var(--gn-divide)] px-9 py-4 text-sm font-semibold text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-muted)]"
            >
              Browse strains
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
