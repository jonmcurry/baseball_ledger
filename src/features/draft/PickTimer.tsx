/**
 * PickTimer
 *
 * Countdown timer for draft picks (60s default).
 * Visual urgency styling at <10 seconds.
 * Feature-scoped sub-component. No store imports.
 */

export interface PickTimerProps {
  timeRemaining: number;
  isActive: boolean;
}

export function PickTimer({ timeRemaining, isActive }: PickTimerProps) {
  const isUrgent = timeRemaining <= 10 && timeRemaining > 0;
  const isExpired = timeRemaining <= 0;

  return (
    <div
      role="timer"
      aria-label="Pick timer"
      className={`inline-flex items-center gap-2 rounded-card border px-gutter py-2 ${
        isExpired
          ? 'border-stitch-red bg-stitch-red/10'
          : isUrgent
            ? 'border-stitch-red bg-stitch-red/5'
            : 'border-sandstone bg-old-lace'
      }`}
    >
      <span className={`font-stat text-2xl font-bold ${
        isExpired || isUrgent ? 'text-stitch-red' : 'text-ink'
      }`}>
        {isActive ? `${timeRemaining}s` : '--'}
      </span>
      <span className="text-xs text-muted">
        {isExpired ? 'Time expired' : isActive ? 'remaining' : 'Waiting...'}
      </span>
    </div>
  );
}

export default PickTimer;
