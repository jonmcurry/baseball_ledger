/**
 * PickTimer
 *
 * Vintage scoreboard-style countdown timer for draft picks.
 * Visual urgency styling at <10 seconds with glow effect.
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
      className={`scoreboard-panel flex items-center gap-4 ${
        isUrgent || isExpired ? 'animate-glow' : ''
      }`}
      style={{
        background: isExpired
          ? 'linear-gradient(180deg, #8B2020 0%, #5C1515 100%)'
          : isUrgent
            ? 'linear-gradient(180deg, #6B3A1A 0%, #4A2810 100%)'
            : undefined,
      }}
    >
      {/* Clock icon */}
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-ink)]/30">
        <svg
          className={`h-5 w-5 ${isUrgent || isExpired ? 'text-[var(--color-gold)]' : 'text-[var(--color-scoreboard-text)]'}`}
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
      </div>

      {/* Time display */}
      <div className="flex flex-col">
        <div
          className={`font-scoreboard text-4xl font-bold tracking-wider ${
            isExpired
              ? 'text-[var(--color-gold)]'
              : isUrgent
                ? 'text-[var(--color-gold)]'
                : 'text-[var(--color-scoreboard-text)]'
          }`}
          style={{
            textShadow: isUrgent || isExpired
              ? '0 0 20px var(--color-gold), 0 0 40px var(--color-gold)'
              : '0 0 10px var(--color-scoreboard-glow)',
          }}
        >
          {display}
        </div>
        <span className="text-xs uppercase tracking-wider text-[var(--color-scoreboard-text)]/70">
          {isExpired ? 'Time Expired!' : isActive ? 'On the Clock' : 'Waiting...'}
        </span>
      </div>
    </div>
  );
}

export default PickTimer;
