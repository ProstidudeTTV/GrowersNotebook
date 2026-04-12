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

function HeroPreview() {
  return (
    <div
      className="relative mx-auto w-full max-w-lg lg:max-w-none"
      aria-hidden
    >
      <div className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.12),transparent_70%)] blur-2xl dark:bg-[radial-gradient(circle,rgba(34,197,94,0.15),transparent_70%)]" />
      <div className="absolute -bottom-10 -right-6 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(255,69,0,0.12),transparent_68%)] blur-2xl" />

      <div className="relative space-y-4">
        <div className="flex justify-end">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface-elevated)]/80 px-3 py-1 text-xs font-medium text-[var(--gn-text-muted)] shadow-[var(--gn-shadow-sm)] backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Growers online now
          </span>
        </div>

        <div className="rounded-2xl border border-[var(--gn-border)] bg-[var(--gn-surface-elevated)]/75 p-4 shadow-[var(--gn-shadow-lg)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff4500]/25 to-emerald-500/20 text-[#ff4500]">
              <IconLeaf className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--gn-text)]">
                Week 6 flower — frost coming in
              </p>
              <p className="text-xs text-[var(--gn-text-muted)]">
                in <span className="text-[#ff6a38]">LED &amp; living soil</span> ·
                128 votes
              </p>
            </div>
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[var(--gn-text-excerpt)]">
            Dialing VPD and keeping temps steady. Sharing notes on terpene
            preservation for the final two weeks.
          </p>
        </div>

        <div className="ml-4 mr-0 rounded-2xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)]/60 p-4 shadow-[var(--gn-shadow-md)] backdrop-blur-sm sm:ml-12">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-[var(--gn-surface-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--gn-text-muted)] ring-1 ring-[var(--gn-border)]">
              Strain library
            </span>
            <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Gelato × Breath
            </span>
            <span className="text-xs text-[var(--gn-text-muted)]">
              breeder &amp; review data
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GuestLanding({
  communities,
  loadError,
  apiBase,
  hostedDeploy = false,
  heroBlurb = SITE_TAGLINE,
}: {
  communities: GuestLandingCommunity[];
  loadError: string | null;
  apiBase: string;
  /** Show Render/production troubleshooting instead of local npm hints */
  hostedDeploy?: boolean;
  /** Shown under the hero headline; defaults to code tagline, or pass admin meta description */
  heroBlurb?: string;
}) {
  const featured = communities.slice(0, 8);

  return (
    <main className="relative min-w-0">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[min(68vh,720px)] overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[420px] w-[min(1100px,100vw)] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center_top,rgba(255,69,0,0.11),transparent_62%)]" />
        <div className="absolute right-[10%] top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.06),transparent_70%)] blur-2xl" />
        <div
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:pb-20 sm:pt-14 lg:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-10">
          <div className="min-w-0">
            <p className="text-sm font-medium uppercase tracking-widest text-[var(--gn-text-muted)]">
              Welcome to {SITE_NAME}
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-[var(--gn-text)] sm:text-5xl lg:text-[3.35rem]">
              Grow smarter{" "}
              <span className="bg-gradient-to-r from-[#ff4500] via-[#ff6a38] to-[#ffa64d] bg-clip-text text-transparent">
                together
              </span>
              .
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--gn-text-muted)]">
              {heroBlurb}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-[#ff4500] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_40px_-12px_rgba(255,69,0,0.55)] transition hover:bg-[#ff5724] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4500]"
              >
                Sign in to join
              </Link>
              <Link
                href="/hot"
                className="inline-flex items-center justify-center rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface-elevated)]/50 px-7 py-3.5 text-sm font-semibold text-[var(--gn-text)] shadow-[var(--gn-shadow-sm)] backdrop-blur-sm transition hover:border-[var(--gn-ring)] hover:bg-[var(--gn-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gn-ring-focus)]"
              >
                Browse posts
              </Link>
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full px-4 py-3.5 text-sm font-medium text-[var(--gn-text-muted)] transition hover:text-[#5865F2]"
              >
                Discord
              </a>
            </div>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section className="border-y border-[var(--gn-divide)] bg-[color-mix(in_srgb,var(--gn-surface-muted)_55%,transparent)] py-14 backdrop-blur-[2px]">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gn-text-muted)]">
            Built for serious home growers
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <article className="rounded-2xl border border-[var(--gn-border)] bg-[var(--gn-surface-elevated)]/70 p-6 shadow-[var(--gn-shadow-sm)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ff4500]/12 text-[#ff4500]">
                <IconUsers className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--gn-text)]">
                Real communities
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--gn-text-muted)]">
                Join rooms focused on organics, LEDs, outdoor, breeders, and
                everything between — with growers who actually run gardens.
              </p>
            </article>
            <article className="rounded-2xl border border-[var(--gn-border)] bg-[var(--gn-surface-elevated)]/70 p-6 shadow-[var(--gn-shadow-sm)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                <IconBook className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--gn-text)]">
                Notebooks
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--gn-text-muted)]">
                Share notebooks, ask questions, and search what worked for
                others—your run stays readable and searchable over time.
              </p>
            </article>
            <article className="rounded-2xl border border-[var(--gn-border)] bg-[var(--gn-surface-elevated)]/70 p-6 shadow-[var(--gn-shadow-sm)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/12 text-violet-600 dark:text-violet-400">
                <IconLeaf className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--gn-text)]">
                Strain &amp; breeder intel
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--gn-text-muted)]">
                Explore the catalog, compare genetics, and read reviews from
                people who grew them — not just seed-shop copy.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="explore" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--gn-text)] sm:text-3xl">
              Explore communities
            </h2>
            <p className="mt-2 max-w-xl text-[var(--gn-text-muted)]">
              Peek at public rooms — sign in to subscribe, post, and message
              other growers.
            </p>
          </div>
          <Link
            href="/login"
            className="shrink-0 text-sm font-semibold text-[#ff6a38] transition hover:text-[#ff7d4c]"
          >
            Create an account →
          </Link>
        </div>

        {loadError ? (
          <div className="mt-10 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-6 text-amber-950 dark:border-amber-900/80 dark:bg-amber-950/35 dark:text-amber-100">
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
                  On your <strong>hosted API</strong> service (e.g. Render → API), open Logs and
                  confirm the latest deploy is live. Try <code className="rounded bg-black/10 px-1 dark:bg-white/10">{apiBase}/health</code>.
                </li>
                <li>
                  If the API recently added catalog columns, run the migration
                  on your Supabase DB (e.g. <code className="rounded bg-black/10 px-1 dark:bg-white/10">icon_key</code> on{" "}
                  <code className="rounded bg-black/10 px-1 dark:bg-white/10">communities</code>).
                </li>
              </ul>
            ) : null}
          </div>
        ) : featured.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-[var(--gn-divide)] py-12 text-center text-sm text-[var(--gn-text-muted)]">
            No communities yet. Check back soon.
          </p>
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/community/${c.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-[var(--gn-border)] bg-[var(--gn-surface-elevated)]/55 p-5 shadow-[var(--gn-shadow-sm)] transition hover:border-[rgba(255,106,56,0.35)] hover:bg-[var(--gn-surface-hover)] hover:shadow-[var(--gn-shadow-hover)]"
                >
                  <div className="flex items-start gap-3">
                    <CommunityIcon
                      iconKey={c.iconKey}
                      nameFallback={c.name}
                      slugFallback={c.slug}
                      frameClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--gn-surface-muted)_85%,transparent)] text-[var(--gn-text)] ring-1 ring-[var(--gn-ring)]"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[#ff6a38] transition group-hover:text-[#ff7d4c]">
                        {c.name}
                      </h3>
                      {c.description?.trim() ? (
                        <p className="mt-2 line-clamp-3 text-sm leading-snug text-[var(--gn-text-muted)]">
                          {c.description.trim()}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm italic text-[var(--gn-text-muted)]/75">
                          Open the room →
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-[var(--gn-divide)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--gn-surface-elevated)_40%,transparent),transparent)] py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--gn-text)] sm:text-3xl">
            Ready when you are
          </h2>
          <p className="mt-3 text-[var(--gn-text-muted)]">
            Free to join. Bring your garden, your questions, and your harvest
            photos.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-[#ff4500] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_12px_40px_-12px_rgba(255,69,0,0.5)] transition hover:bg-[#ff5724]"
            >
              Get started
            </Link>
            <Link
              href="/strains"
              className="inline-flex items-center justify-center rounded-full border border-[var(--gn-border)] px-8 py-3.5 text-sm font-semibold text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)]"
            >
              Browse strains
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
