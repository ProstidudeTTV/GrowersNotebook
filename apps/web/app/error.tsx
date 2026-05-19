"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
      <button
        type="button"
        onClick={() => reset()}
        className="mt-8 rounded-full bg-[var(--gn-accent)] px-5 py-2 text-sm font-semibold text-[var(--gn-on-accent)] hover:brightness-110"
      >
        Try again
      </button>
    </main>
  );
}
