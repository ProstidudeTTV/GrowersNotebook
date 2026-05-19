import Link from "next/link";
import { CatalogSuggestClient } from "@/components/catalog/catalog-suggest-client";

export default function CatalogSuggestPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-950 via-purple-900/60 to-[var(--gn-surface-elevated)] p-6 sm:p-8">
        <div className="relative z-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-300">
            🌿 Help grow the catalog
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Suggest a Strain or Breeder
          </h1>
          <p className="mt-2 max-w-lg text-sm text-white/70">
            Know a strain or breeder that should be in here? Fill this out and our team will review it — usually within a day or two.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/60">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--gn-accent)]" />
              Staff review everything before it goes live
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--gn-accent)]" />
              No account? <Link href="/login" className="underline hover:text-white">Sign in first</Link>
            </span>
          </div>
        </div>
        <div className="pointer-events-none absolute right-4 top-4 select-none text-8xl opacity-10">🧬</div>
      </div>

      {/* Check existing first */}
      <div className="mb-6 flex gap-3 rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] p-4 text-sm">
        <span className="text-xl">💡</span>
        <p className="text-[var(--gn-text-muted)]">
          Before submitting, check if it already exists:{" "}
          <Link href="/strains" className="font-medium text-[var(--gn-accent)] hover:underline">
            Browse Strains
          </Link>
          {" · "}
          <Link href="/breeders" className="font-medium text-[var(--gn-accent)] hover:underline">
            Browse Breeders
          </Link>
        </p>
      </div>

      <CatalogSuggestClient />
    </main>
  );
}
