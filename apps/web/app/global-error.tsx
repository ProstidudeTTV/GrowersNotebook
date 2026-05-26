"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="bg-[var(--gn-page-mid)] text-[var(--gn-text)]">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gn-text-muted)]">
            Unexpected Error
          </p>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">
            Something went wrong.
          </h1>
          <p className="mt-3 text-sm text-[var(--gn-text-muted)]">
            The error was recorded so the site can be fixed quickly.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-full bg-[var(--gn-accent)] px-4 py-2 text-sm font-semibold text-black"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
