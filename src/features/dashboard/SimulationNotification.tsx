/**
 * SimulationNotification
 *
 * Typewriter-effect notification shown after simulation completes (REQ-SCH-007).
 * Auto-dismisses after the typewriter animation finishes + a short delay.
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
}

const AUTO_DISMISS_MS = 4000;

function buildMessage(days: number, games: number): string {
  if (days === 1) {
    return `Simulation complete -- ${games} game${games !== 1 ? 's' : ''} simulated`;
  }
  return `${days} days simulated -- ${games} game${games !== 1 ? 's' : ''} complete`;
}

export function SimulationNotification({
  daysSimulated,
  gamesCompleted,
  isVisible,
  onDismiss,
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

  const message = buildMessage(daysSimulated, gamesCompleted);

  return (
    <div
      data-testid="simulation-notification"
      className="border-l-4 border-stitch-red bg-old-lace/80 px-4 py-3 font-headline text-sm text-ink"
    >
      <TypewriterText text={message} speed={40} onComplete={handleTypewriterComplete} />
    </div>
  );
}

export default SimulationNotification;
