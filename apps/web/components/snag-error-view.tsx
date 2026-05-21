"use client";

import Link from "next/link";

type Props = {
  /** When set, shows a primary button that calls this (e.g. error boundary reset). */
  onTryAgain?: () => void;
  /** When true and no `onTryAgain`, links back to the public home page. */
  showHomeLink?: boolean;
};

/**
 * Shared “Something went wrong / We hit a snag” surface (matches `app/error.tsx`).
 */
export function SnagErrorView({ onTryAgain, showHomeLink = false }: Props) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--gn-hot)]">
        Something went wrong
      </p>
      <h1 className="mt-2 text-2xl font-bold text-[var(--gn-text)]">
        We hit a snag
      </h1>
      <p className="mt-3 text-sm text-[var(--gn-text-muted)]">
        Try again in a moment. If this keeps happening, refresh the page or
        come back later.
      </p>
      {onTryAgain ? (
        <button
          type="button"
          onClick={onTryAgain}
          className="mt-8 rounded-full bg-[var(--gn-accent)] px-5 py-2 text-sm font-semibold text-[var(--gn-on-accent)] hover:brightness-110"
        >
          Try again
        </button>
      ) : showHomeLink ? (
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-[var(--gn-accent)] px-5 py-2 text-sm font-semibold text-[var(--gn-on-accent)] hover:brightness-110"
        >
          Back to home
        </Link>
      ) : null}
    </main>
  );
}
