"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CommunityIcon } from "@/components/community-icon";
import { getSafeCommunityImageUrl } from "@/lib/safe-community-image-url";

export type CommunityDirectoryItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconKey?: string | null;
  iconUrl?: string | null;
  bannerUrl?: string | null;
  memberCount?: number | null;
};

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const STRIP_GRADIENTS = [
  "from-teal-950 to-teal-900",
  "from-cyan-950 to-sky-900",
  "from-blue-950 to-blue-900",
  "from-violet-950 to-violet-900",
  "from-amber-950 to-amber-900",
  "from-fuchsia-950 to-fuchsia-900",
  "from-teal-900 to-cyan-900",
  "from-sky-950 to-blue-900",
  "from-stone-900 to-stone-800",
  "from-orange-950 to-amber-900",
];

function stripGradient(slug: string): string {
  return STRIP_GRADIENTS[hashSeed(slug) % STRIP_GRADIENTS.length] ?? "from-teal-950 to-teal-900";
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function CommunityCard({ community: c }: { community: CommunityDirectoryItem }) {
  const grad = stripGradient(c.slug);
  const hasMemberCount =
    typeof c.memberCount === "number" && c.memberCount > 0;
  const safeBannerUrl = getSafeCommunityImageUrl(c.bannerUrl);

  return (
    <Link
      href={`/community/${c.slug}`}
      className="group gn-card relative flex flex-col overflow-visible transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--gn-shadow-md)]"
    >
      <div className={`relative z-0 h-16 w-full overflow-hidden rounded-t-2xl bg-gradient-to-r ${grad}`}>
        {safeBannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={safeBannerUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.06]"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col rounded-b-2xl bg-[var(--gn-surface-raised)] px-4 pb-4 pt-1">
        <div className="-mt-6 mb-2 w-fit">
          <CommunityIcon
            iconKey={c.iconKey}
            iconUrl={c.iconUrl}
            nameFallback={c.name}
            slugFallback={c.slug}
            frameClassName="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-2 ring-[var(--gn-surface-raised)] shadow-lg text-base font-bold"
          />
        </div>

        <h2 className="text-sm font-bold leading-snug text-[var(--gn-text)]">
          {c.name}
        </h2>

        {hasMemberCount ? (
          <div className="mt-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gn-accent)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--gn-accent)]">
              👥 {formatCount(c.memberCount!)} members
            </span>
          </div>
        ) : null}

        <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-[var(--gn-text-muted)]">
          {c.description?.trim() || "A community for passionate home growers."}
        </p>

        <div className="mt-3 w-full rounded-full bg-[var(--gn-accent)] py-1.5 text-center text-xs font-bold text-[var(--gn-on-accent)]">
          View community →
        </div>
      </div>
    </Link>
  );
}

export function CommunitiesDirectoryClient({
  communities,
}: {
  communities: CommunityDirectoryItem[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return communities;
    return communities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false),
    );
  }, [communities, query]);

  return (
    <div className="py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--gn-text-muted)]">
          <strong className="font-bold text-[var(--gn-text)]">
            {filtered.length}
          </strong>{" "}
          {filtered.length === 1 ? "community" : "communities"}
          {query.trim() ? " matching your search" : ""}
        </p>
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Search communities</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search communities…"
            className="gn-input w-full pl-9"
          />
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm"
            aria-hidden
          >
            🔍
          </span>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-8 py-12 text-center">
          <p className="text-sm text-[var(--gn-text-muted)]">
            No communities match &ldquo;{query.trim()}&rdquo;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {filtered.map((c) => (
            <CommunityCard key={c.id} community={c} />
          ))}
        </div>
      )}
    </div>
  );
}
