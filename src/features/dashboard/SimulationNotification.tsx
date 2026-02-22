/**
 * SimulationNotification
 *
 * Heritage Editorial press wire notification after simulation.
 * Clean typographic alert with typewriter animation.
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
      className="relative overflow-hidden border-t-2 border-[var(--accent-secondary)] bg-[var(--surface-raised)] px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="font-stat text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">
            Press Box Update
          </p>
          <div className="font-headline text-sm font-bold uppercase tracking-wider text-[var(--accent-secondary)]">
            <TypewriterText text={message} speed={30} onComplete={handleTypewriterComplete} />
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="flex h-6 w-6 items-center justify-center text-[var(--text-tertiary)] transition-colors hover:bg-[var(--accent-muted)] hover:text-[var(--text-primary)]"
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
