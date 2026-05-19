/**
 * Notebook detail loading skeleton — shown while the server page fetches the notebook.
 */
function Shimmer({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--gn-radius)] bg-[var(--gn-surface-muted)] ${className}`}
    />
  );
}

export default function NotebookLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <Shimmer className="h-12 w-12 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2 pt-1">
          <Shimmer className="h-7 w-64" />
          <Shimmer className="h-4 w-40" />
        </div>
      </div>

      {/* Pills row */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Shimmer className="h-6 w-24 rounded-full" />
        <Shimmer className="h-6 w-20 rounded-full" />
        <Shimmer className="h-6 w-28 rounded-full" />
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        {/* Week sidebar */}
        <div className="hidden space-y-2 lg:block">
          {Array.from({ length: 5 }, (_, i) => (
            <Shimmer key={i} className="h-10 w-full" />
          ))}
        </div>

        {/* Week content */}
        <div className="space-y-4">
          <Shimmer className="h-64 w-full rounded-2xl" />
          <Shimmer className="h-5 w-3/4" />
          <Shimmer className="h-4 w-full" />
          <Shimmer className="h-4 w-5/6" />
          <Shimmer className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}
