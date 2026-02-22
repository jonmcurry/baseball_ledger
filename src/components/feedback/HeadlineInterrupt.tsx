/**
 * HeadlineInterrupt
 *
 * Full-viewport "STOP THE PRESSES" overlay for championship events
 * and record-breaking moments. Uses .broadsheet-breakout styling.
 * Auto-hides after a configurable delay.
 *
 * Layer 6: Presentational component.
 */

import { useEffect, useCallback } from 'react';

export interface HeadlineInterruptProps {
  headline: string;
  subheadline?: string;
  isVisible: boolean;
  onDismiss: () => void;
  autoHideMs?: number;
}

export function HeadlineInterrupt({
  headline,
  subheadline,
  isVisible,
  onDismiss,
  autoHideMs = 4000,
}: HeadlineInterruptProps) {
  const stableDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(stableDismiss, autoHideMs);
    return () => clearTimeout(timer);
  }, [isVisible, autoHideMs, stableDismiss]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center animate-slide-up"
      style={{ backgroundColor: 'rgba(244, 241, 235, 0.95)' }}
      role="alert"
      aria-live="assertive"
      onClick={stableDismiss}
    >
      <div className="max-w-3xl px-gutter-xl text-center">
        <p className="font-stat text-xs uppercase tracking-widest text-[var(--text-tertiary)] mb-gutter">
          Stop the Presses
        </p>
        <div className="border-y-2 border-[var(--accent-secondary)] py-gutter-lg">
          <h2 className="font-headline text-4xl md:text-6xl font-black text-[var(--accent-secondary)] leading-tight">
            {headline}
          </h2>
          {subheadline && (
            <p className="mt-gutter font-body text-lg italic text-[var(--text-secondary)]">
              {subheadline}
            </p>
          )}
        </div>
        <p className="mt-gutter font-body text-xs text-[var(--text-tertiary)]">
          Click anywhere to dismiss
        </p>
      </div>
    </div>
  );
}

export default HeadlineInterrupt;
