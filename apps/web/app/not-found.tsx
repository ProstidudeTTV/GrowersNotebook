import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--gn-accent)]">
        404
      </p>
      <h1 className="mt-2 text-2xl font-bold text-[var(--gn-text)]">
        This page isn&apos;t in the garden
      </h1>
      <p className="mt-3 text-sm text-[var(--gn-text-muted)]">
        The link may be broken or the page was removed. Head back to the feed
        and keep growing.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-[var(--gn-accent)] px-5 py-2 text-sm font-semibold text-[var(--gn-on-accent)] hover:brightness-110"
        >
          Go home
        </Link>
        <Link
          href="/community"
          className="rounded-full border border-[var(--gn-divide)] px-5 py-2 text-sm font-medium text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)]"
        >
          Browse communities
        </Link>
      </div>
    </main>
  );
}
