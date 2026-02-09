/**
 * ErrorBanner
 *
 * Severity-based alert banner with optional auto-dismiss.
 * - error: role="alert", aria-live="assertive", stitch-red styling
 * - warning: role="status", aria-live="polite", amber styling
 * - info: role="status", aria-live="polite", ballpark styling
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

import { useEffect } from 'react';

export type BannerSeverity = 'error' | 'warning' | 'info';

export interface ErrorBannerProps {
  severity: BannerSeverity;
  message: string;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

const SEVERITY_STYLES: Record<BannerSeverity, string> = {
  error: 'bg-stitch-red/10 border-stitch-red text-stitch-red',
  warning: 'bg-amber-50 border-amber-500 text-amber-800',
  info: 'bg-ballpark/10 border-ballpark text-ballpark',
};

export function ErrorBanner({
  severity,
  message,
  onDismiss,
  autoDismissMs,
}: ErrorBannerProps) {
  useEffect(() => {
    if (!autoDismissMs || !onDismiss) return;

    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  const isError = severity === 'error';
  const role = isError ? 'alert' : 'status';
  const ariaLive = isError ? 'assertive' : 'polite';

  return (
    <div
      role={role}
      aria-live={ariaLive as 'assertive' | 'polite'}
      className={`flex items-center justify-between rounded-card border px-gutter py-3 font-body text-sm ${SEVERITY_STYLES[severity]}`}
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="ml-gutter opacity-70 hover:opacity-100"
        >
          &#x2715;
        </button>
      )}
    </div>
  );
}
