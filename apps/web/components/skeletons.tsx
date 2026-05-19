/**
 * Reusable loading skeleton components that mirror the shape of real content.
 * All shimmer blocks use animate-pulse and CSS custom property tokens — no hardcoded colors.
 */

function Shimmer({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--gn-radius)] bg-[var(--gn-surface-muted)] ${className}`}
    />
  );
}

export function SkeletonFeedCard() {
  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] shadow-[var(--gn-shadow-sm)]">
      <Shimmer className="h-56 w-full rounded-none sm:h-72" />
      <div className="flex">
        <div className="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] py-3">
          <Shimmer className="h-6 w-6 rounded-md" />
          <Shimmer className="h-4 w-6" />
          <Shimmer className="h-6 w-6 rounded-md" />
        </div>
        <div className="min-w-0 flex-1 space-y-2 px-3 py-3">
          <Shimmer className="h-3 w-[42%]" />
          <Shimmer className="h-5 w-[72%]" />
          <Shimmer className="h-3.5 w-[88%]" />
          <Shimmer className="h-3.5 w-[55%]" />
          <div className="mt-3 flex gap-2">
            <Shimmer className="h-8 w-16 rounded-full" />
            <Shimmer className="h-8 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function SkeletonThreadRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Shimmer className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Shimmer className="h-3.5 w-[40%]" />
        <Shimmer className="h-3 w-[70%]" />
      </div>
    </div>
  );
}

export function SkeletonNotifRow() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Shimmer className="mt-0.5 h-8 w-8 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <Shimmer className="h-3.5 w-[52%]" />
        <Shimmer className="h-3 w-[32%]" />
      </div>
    </div>
  );
}

export function SkeletonFeedList() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }, (_, i) => (
        <SkeletonFeedCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonThreadList() {
  return (
    <div className="divide-y divide-[var(--gn-divide)]">
      {Array.from({ length: 6 }, (_, i) => (
        <SkeletonThreadRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonNotifList() {
  return (
    <div className="divide-y divide-[var(--gn-divide)]">
      {Array.from({ length: 6 }, (_, i) => (
        <SkeletonNotifRow key={i} />
      ))}
    </div>
  );
}
