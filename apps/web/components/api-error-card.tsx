'use client';

interface ApiErrorCardProps {
  message?: string;
  onRetry?: () => void;
}

export function ApiErrorCard({
  message = 'Could not load content right now.',
  onRetry,
}: ApiErrorCardProps) {
  return (
    <div className="text-center py-12 gn-panel rounded-2xl">
      <div className="text-4xl mb-3">🌿</div>
      <h3 className="font-semibold text-[var(--gn-text)] mb-2">Something went sideways</h3>
      <p className="text-sm text-[var(--gn-text-muted)] mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 bg-[var(--gn-accent)] text-white rounded-full px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      )}
    </div>
  );
}
