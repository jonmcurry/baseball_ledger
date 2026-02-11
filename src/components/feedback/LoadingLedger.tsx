/**
 * LoadingLedger
 *
 * Animated "Processing Ledger..." loading indicator with 3 staggered dots.
 * Respects prefers-reduced-motion by showing static dots.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

export interface LoadingLedgerProps {
  message?: string;
}

export function LoadingLedger({ message = 'Processing Ledger...' }: LoadingLedgerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className="flex flex-col items-center justify-center gap-3 py-gutter-xl font-headline text-ballpark"
    >
      <div className="flex gap-1.5" aria-hidden="true">
        <span
          data-dot=""
          className="h-2.5 w-2.5 rounded-full bg-ballpark animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          data-dot=""
          className="h-2.5 w-2.5 rounded-full bg-ballpark animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          data-dot=""
          className="h-2.5 w-2.5 rounded-full bg-ballpark animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span className="text-lg">{message}</span>
    </div>
  );
}

export default LoadingLedger;
