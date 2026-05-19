'use client';

/**
 * ErrorState — shared inline error card with an optional retry button.
 *
 * Before this component, failed API calls would silently leave skeletons or
 * empty states on screen. Now every list / detail page renders ErrorState
 * when SWR (or a manual fetch) returns an error, with a clear way back.
 */

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export default function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this data. Please try again.',
  onRetry,
  retryLabel = 'Retry',
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-12 h-12 rounded-lg bg-[color:var(--danger-soft)] flex items-center justify-center mb-4 text-[color:var(--danger)]">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{title}</h3>
      <p className="text-sm text-[color:var(--foreground-muted)] mt-1 max-w-xs">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 border border-[color:var(--border-strong)] text-[color:var(--foreground)] text-sm font-medium rounded-md hover:bg-[color:var(--surface-muted)] transition-colors"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
