import type { Metadata } from "next";
import Link from "next/link";
import { CommunityIcon } from "@/components/community-icon";
import { apiFetch } from "@/lib/api-public";
import { SITE_NAME, canonicalPath } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Communities",
  description: `Browse all grow communities on ${SITE_NAME}. Find your tribe, share your grows, and learn from fellow home growers.`,
  openGraph: {
    title: `Communities · ${SITE_NAME}`,
    url: canonicalPath("/community"),
  },
  alternates: { canonical: canonicalPath("/community") },
};

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconKey?: string | null;
  iconUrl?: string | null;
  memberCount?: number | null;
};

/** Deterministic hash — matches CommunityIcon palette key */
function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const STRIP_GRADIENTS = [
  "from-emerald-950 to-green-900",
  "from-teal-950 to-teal-900",
  "from-blue-950 to-blue-900",
  "from-violet-950 to-violet-900",
  "from-amber-950 to-amber-900",
  "from-fuchsia-950 to-fuchsia-900",
  "from-emerald-900 to-cyan-900",
  "from-cyan-950 to-sky-900",
  "from-stone-900 to-stone-800",
  "from-orange-950 to-amber-900",
];

function stripGradient(slug: string): string {
  return STRIP_GRADIENTS[hashSeed(slug) % STRIP_GRADIENTS.length] ?? "from-emerald-950 to-green-900";
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function CommunityCard({ community: c }: { community: Community }) {
  const grad = stripGradient(c.slug);
  const hasMemberCount =
    typeof c.memberCount === "number" && c.memberCount > 0;

  return (
    <Link
      href={`/community/${c.slug}`}
      className="group gn-card flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--gn-shadow-md)]"
    >
      {/* Colored top strip */}
      <div className={`relative h-16 w-full bg-gradient-to-r ${grad}`}>
        {/* Subtle pattern overlay */}
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.06]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id={`dots-${c.slug}`}
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="10" cy="10" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#dots-${c.slug})`} />
        </svg>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col px-4 pb-4">
        {/* Icon — overlaps strip */}
        <div className="-mt-5 mb-2">
          {c.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.iconUrl}
              alt={c.name}
              className="h-10 w-10 rounded-xl object-cover ring-2 ring-[var(--gn-surface-raised)] shadow-lg"
            />
          ) : (
            <CommunityIcon
              iconKey={c.iconKey}
              nameFallback={c.name}
              slugFallback={c.slug}
              frameClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-2 ring-[var(--gn-surface-raised)] shadow-lg text-base font-bold"
            />
          )}
        </div>

        {/* Name */}
        <h2 className="text-sm font-bold text-[var(--gn-text)] leading-snug">
          {c.name}
        </h2>

        {/* Member count pill */}
        {hasMemberCount && (
          <div className="mt-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gn-accent)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--gn-accent)]">
              👥 {formatCount(c.memberCount!)} members
            </span>
          </div>
        )}

        {/* Description */}
        <p className="mt-2 flex-1 text-xs leading-relaxed text-[var(--gn-text-muted)] line-clamp-3">
          {c.description?.trim() || "A community for passionate home growers."}
        </p>

        {/* Join CTA — appears on hover */}
        <div className="mt-3 w-full rounded-full bg-[var(--gn-accent)] py-1.5 text-center text-xs font-bold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          Join →
        </div>
      </div>
    </Link>
  );
}

export default async function CommunityDirectoryPage() {
  let communities: Community[] = [];
  let loadError: string | null = null;

  try {
    communities = await apiFetch<Community[]>("/communities");
  } catch (e) {
    loadError =
      e instanceof Error ? e.message : "Could not load communities right now.";
  }

  return (
    <main className="mx-auto max-w-5xl pb-16">

      {/* ── Hero banner ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-emerald-950 via-green-900 to-teal-950 px-6 py-12 sm:px-10 sm:py-16">
        {/* Decorative background glow */}
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-green-500/10 blur-3xl" />
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />

        <div className="relative text-center">
          <div className="mb-3 text-4xl">🌿</div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Find Your Grow Tribe
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base text-white/70">
            Join a community of passionate home growers. Share your grows,
            swap tips, and thrive together.
          </p>

          {/* Quick search CTA */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/hot"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-white/20"
            >
              🔥 What&apos;s Hot
            </Link>
            <Link
              href="/following"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--gn-accent)] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-900/40 transition hover:brightness-110"
            >
              My Feed →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Community grid ────────────────────────────────────────────── */}
      <div className="px-4 py-6">
        {loadError ? (
          <div className="rounded-2xl border border-dashed border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-8 py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gn-surface-elevated)]">
              <svg
                className="h-7 w-7 text-[var(--gn-text-muted)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold text-[var(--gn-text)]">
              Something went sideways
            </h3>
            <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
              {loadError}
            </p>
            <Link
              href="/community"
              className="mt-5 inline-flex rounded-full bg-[var(--gn-accent)] px-5 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              Try again
            </Link>
          </div>
        ) : communities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-8 py-16 text-center">
            <div className="text-5xl mb-4">🌱</div>
            <h3 className="text-lg font-bold text-[var(--gn-text)]">
              Plant your first seed
            </h3>
            <p className="mt-2 text-sm text-[var(--gn-text-muted)]">
              No communities yet — check back soon.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-[var(--gn-text-muted)]">
                <strong className="font-bold text-[var(--gn-text)]">
                  {communities.length}
                </strong>{" "}
                {communities.length === 1 ? "community" : "communities"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {communities.map((c) => (
                <CommunityCard key={c.id} community={c} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
