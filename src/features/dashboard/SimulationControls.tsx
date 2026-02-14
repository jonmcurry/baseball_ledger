/**
 * SimulationControls
 *
 * Vintage scoreboard-style control panel for advancing simulation.
 * Golden era aesthetic with stadium control booth feel.
 */

export interface SimulationControlsProps {
  isRunning: boolean;
  progressPct: number;
  onSimulate: (scope: 'day' | 'week' | 'month' | 'season') => void;
  leagueStatus?: string | null;
}

const SCOPES: { scope: 'day' | 'week' | 'month' | 'season'; label: string; icon: string }[] = [
  { scope: 'day', label: 'Sim Day', icon: '1' },
  { scope: 'week', label: 'Sim Week', icon: '7' },
  { scope: 'month', label: 'Sim Month', icon: '30' },
  { scope: 'season', label: 'Full Season', icon: '162' },
];

export function SimulationControls({
  isRunning,
  progressPct,
  onSimulate,
  leagueStatus,
}: SimulationControlsProps) {
  const isPlayoffs = leagueStatus === 'playoffs';
  const availableScopes = isPlayoffs ? SCOPES.filter((s) => s.scope === 'day') : SCOPES;

  return (
    <div className="scoreboard-panel">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-ink)]/30">
          <svg
            className="h-5 w-5 text-[var(--color-gold)]"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
          </svg>
        </div>
        <div>
          <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-[var(--color-scoreboard-text)]">
            Simulation Controls
          </h3>
          <p className="font-stat text-xs text-[var(--color-scoreboard-text)]/60">
            {isPlayoffs ? 'Playoff mode: single game' : 'Advance the season'}
          </p>
        </div>
      </div>

      {/* Control buttons */}
      <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
        {availableScopes.map(({ scope, label, icon }) => (
          <button
            key={scope}
            type="button"
            disabled={isRunning}
            onClick={() => onSimulate(scope)}
            className="group relative flex flex-col items-center gap-1 rounded border border-[var(--color-ink)]/30 bg-gradient-to-b from-[var(--color-ink)]/20 to-[var(--color-ink)]/40 px-4 py-3 transition-all hover:border-[var(--color-gold)] hover:from-[var(--color-gold)]/20 hover:to-[var(--color-gold)]/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {/* Days indicator */}
            <span className="font-scoreboard text-2xl font-bold text-[var(--color-gold)] transition-transform group-hover:scale-110">
              {icon}
            </span>
            <span className="font-stat text-[10px] uppercase tracking-wider text-[var(--color-scoreboard-text)]/70">
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Progress bar */}
      {isRunning && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-stat text-[10px] uppercase tracking-wider text-[var(--color-scoreboard-text)]/70">
              Simulating...
            </span>
            <span className="font-scoreboard text-sm text-[var(--color-gold)]">
              {progressPct}%
            </span>
          </div>
          <div
            className="h-3 overflow-hidden rounded-full border border-[var(--color-ink)]/30 bg-[var(--color-ink)]/20"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] transition-all duration-300"
              style={{
                width: `${progressPct}%`,
                boxShadow: '0 0 10px var(--color-gold)',
              }}
            />
          </div>
        </div>
      )}

      {/* Footer decoration */}
      <div className="mt-4 border-t border-[var(--color-ink)]/20 pt-2">
        <p className="text-center font-stat text-[10px] uppercase tracking-widest text-[var(--color-scoreboard-text)]/40">
          ★ Press Box Controls ★
        </p>
      </div>
    </div>
  );
}

export default SimulationControls;
