/**
 * PickTimer
 *
 * Heritage Editorial countdown timer for draft picks.
 * Crimson accent urgency at <10 seconds.
 * Feature-scoped sub-component. No store imports.
 */

export interface PickTimerProps {
  timeRemaining: number;
  isActive: boolean;
}

export function PickTimer({ timeRemaining, isActive }: PickTimerProps) {
  const isUrgent = timeRemaining <= 10 && timeRemaining > 0;
  const isExpired = timeRemaining <= 0;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const display = isActive
    ? `${minutes}:${seconds.toString().padStart(2, '0')}`
    : '--:--';

  return (
    <div
      role="timer"
      aria-label="Pick timer"
      className={`flex items-center gap-3 border px-4 py-2 ${
        isExpired
          ? 'border-[var(--accent-secondary)] bg-[var(--accent-secondary)]/10'
          : isUrgent
            ? 'border-[var(--accent-secondary)]'
            : 'border-[var(--border-default)]'
      }`}
    >
      {/* Clock icon */}
      <svg
        className={`h-5 w-5 ${
          isUrgent || isExpired
            ? 'text-[var(--accent-secondary)]'
            : 'text-[var(--text-secondary)]'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      {/* Time display */}
      <div className="flex flex-col">
        <div
          className={`font-stat text-3xl font-bold tracking-wider ${
            isExpired || isUrgent
              ? 'text-[var(--accent-secondary)]'
              : 'text-[var(--text-primary)]'
          }`}
        >
          {display}
        </div>
        <span className="text-xs text-[var(--text-secondary)]">
          {isExpired ? 'Time Expired!' : isActive ? 'On the Clock' : 'Waiting...'}
        </span>
      </div>
    </div>
  );
}

export default PickTimer;
