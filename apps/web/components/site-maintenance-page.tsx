import Link from "next/link";

export function SiteMaintenancePage({
  message,
}: {
  message: string | null;
}) {
  const body =
    message?.trim() ||
    "We’re performing maintenance. Please try again shortly.";
  return (
    <main className="gn-app-canvas flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md rounded-2xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-8 text-center shadow-[var(--gn-shadow-lg)]">
        <h1 className="text-xl font-bold text-[var(--gn-text)]">
          Temporarily unavailable
        </h1>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--gn-text-muted)]">
          {body}
        </p>
        <p className="mt-6 text-sm">
          <Link
            href="/login"
            className="font-semibold text-[#ff4500] hover:underline"
          >
            Staff sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
