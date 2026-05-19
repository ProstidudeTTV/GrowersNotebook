/**
 * Reusable loading skeleton components that mirror the shape of real content.
 * All shimmer blocks use animate-pulse and CSS custom property tokens — no hardcoded colors.
 */

// ---------------------------------------------------------------------------
// Primitive shimmer block
// ---------------------------------------------------------------------------

function Shimmer({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--gn-radius)] bg-[var(--gn-surface-muted)] ${className}`}
    />
  );
}

// ---------------------------------------------------------------------------
// SkeletonFeedCard — mirrors FeedPostCard
// ---------------------------------------------------------------------------

export function SkeletonFeedCard() {
  return (
    <article className="rounded-2xl border border-[var(--gn-border)] bg-[var(--gn-surface-raised)] shadow-[var(--gn-shadow-sm)]">
      {/* Main content area */}
      <div className="p-3.5 sm:p-4">
        <div className="flex items-start gap-2">
          {/* Avatar / community icon circle — 40 px */}
          <Shimmer className="h-10 w-10 shrink-0 rounded-full" />

          {/* Right column */}
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            {/* Community · author · time meta line */}
            <Shimmer className="h-3 w-[48%]" />
            {/* Post title */}
            <Shimmer className="h-5 w-[68%]" />
            {/* Excerpt lines */}
            <Shimmer className="h-3.5 w-[82%]" />
            <Shimmer className="h-3.5 w-[44%]" />
          </div>
        </div>

        {/* Media / image preview placeholder — ~200 px tall */}
        <Shimmer className="mt-3 h-[200px] w-full rounded-xl" />
      </div>

      {/* Action bar — vote pill + comments + share */}
      <div className="flex items-center gap-2 border-t border-[var(--gn-divide)] px-3.5 py-2.5 sm:px-4">
        <Shimmer className="h-8 w-20 rounded-full" />
        <Shimmer className="h-8 w-14 rounded-full" />
        <Shimmer className="h-8 w-14 rounded-full" />
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// SkeletonThreadRow — mirrors a messages thread list row
// ---------------------------------------------------------------------------

export function SkeletonThreadRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Avatar circle — 40 px */}
      <Shimmer className="h-10 w-10 shrink-0 rounded-full" />

      {/* Right column */}
      <div className="min-w-0 flex-1 space-y-2">
        {/* Participant name */}
        <Shimmer className="h-3.5 w-[40%]" />
        {/* Message preview */}
        <Shimmer className="h-3 w-[70%]" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SkeletonNotifRow — mirrors a notification item
// ---------------------------------------------------------------------------

export function SkeletonNotifRow() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {/* Icon circle — 32 px */}
      <Shimmer className="mt-0.5 h-8 w-8 shrink-0 rounded-full" />

      {/* Right column */}
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        {/* Title */}
        <Shimmer className="h-3.5 w-[52%]" />
        {/* Subtitle / body */}
        <Shimmer className="h-3 w-[32%]" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List composites
// ---------------------------------------------------------------------------

export function SkeletonFeedList() {
  return (
    <div className="divide-y divide-[var(--gn-divide)]">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="py-3 first:pt-0 last:pb-0">
          <SkeletonFeedCard />
        </div>
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
