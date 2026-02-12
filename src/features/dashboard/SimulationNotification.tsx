/**
 * SimulationNotification
 *
 * Vintage press box ticker-style notification after simulation.
 * Golden era aesthetic with typewriter animation.
 *
 * REQ-SCH-007: Typewriter-effect notification.
 *
 * Layer 7: Feature component. Uses shared TypewriterText.
 */

import { useRef, useEffect, useCallback } from 'react';
import { TypewriterText } from '@components/feedback/TypewriterText';

export interface SimulationNotificationProps {
  daysSimulated: number;
  gamesCompleted: number;
  isVisible: boolean;
  onDismiss: () => void;
  playoffMessage?: string;
}

const AUTO_DISMISS_MS = 4000;

function buildMessage(days: number, games: number): string {
  if (days === 1) {
    return `SIMULATION COMPLETE -- ${games} game${games !== 1 ? 's' : ''} simulated`;
  }
  return `${days} DAYS SIMULATED -- ${games} game${games !== 1 ? 's' : ''} complete`;
}

export function SimulationNotification({
  daysSimulated,
  gamesCompleted,
  isVisible,
  onDismiss,
  playoffMessage,
}: SimulationNotificationProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleTypewriterComplete = useCallback(() => {
    timerRef.current = setTimeout(() => {
      onDismissRef.current();
    }, AUTO_DISMISS_MS);
  }, []);

  if (!isVisible) return null;

  const message = playoffMessage ?? buildMessage(daysSimulated, gamesCompleted);

  return (
    <div
      data-testid="simulation-notification"
      className="relative overflow-hidden rounded border-2 border-[var(--color-gold)] bg-gradient-to-r from-[var(--color-scoreboard-green)] to-[#0A1520] px-4 py-3 shadow-lg"
      style={{
        boxShadow: '0 0 20px rgba(212, 175, 55, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      {/* Decorative ticker tape effect */}
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[var(--color-gold)] via-[var(--color-gold)]/50 to-[var(--color-gold)]" />

      {/* Content */}
      <div className="flex items-center gap-3">
        {/* Press box icon */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-gold)]/20">
          <svg
            className="h-4 w-4 text-[var(--color-gold)]"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z" />
          </svg>
        </div>

        {/* Typewriter message */}
        <div className="flex-1">
          <p className="font-stat text-[10px] uppercase tracking-widest text-[var(--color-gold)]/60">
            Press Box Update
          </p>
          <div
            className="font-headline text-sm font-bold uppercase tracking-wider text-[var(--color-gold)]"
            style={{
              textShadow: '0 0 10px var(--color-gold)',
            }}
          >
            <TypewriterText text={message} speed={30} onComplete={handleTypewriterComplete} />
          </div>
        </div>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-gold)]/60 transition-colors hover:bg-[var(--color-gold)]/20 hover:text-[var(--color-gold)]"
          aria-label="Dismiss notification"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default SimulationNotification;
