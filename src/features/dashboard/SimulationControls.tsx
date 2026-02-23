/**
 * SimulationControls
 *
 * Heritage Editorial control panel for advancing simulation.
 * Clean typographic buttons with crimson progress indicator.
 */

export interface SimulationControlsProps {
  isRunning: boolean;
  progressPct: number;
  onSimulate: (scope: 'day' | 'week' | 'month' | 'season') => void;
  leagueStatus?: string | null;
}

const SCOPES: { scope: 'day' | 'week' | 'month' | 'season'; label: string; days: string }[] = [
  { scope: 'day', label: 'Sim Day', days: '1' },
  { scope: 'week', label: 'Sim Week', days: '7' },
  { scope: 'month', label: 'Sim Month', days: '30' },
  { scope: 'season', label: 'Full Season', days: '162' },
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
    <div>
      {/* Header */}
      <div className="mb-3">
        <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
          Simulation Controls
        </h3>
        <p className="font-stat text-xs text-[var(--text-secondary)]">
          {isPlayoffs ? 'Playoff mode: single game' : 'Advance the season'}
        </p>
      </div>

      {/* Control buttons */}
      <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
        {availableScopes.map(({ scope, label, days }) => (
          <button
            key={scope}
            type="button"
            disabled={isRunning}
            onClick={() => onSimulate(scope)}
            className="group flex flex-col items-center gap-1 border border-[var(--border-default)] px-4 py-3 transition-all hover:border-[var(--accent-secondary)] hover:bg-[var(--accent-muted)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="font-stat text-2xl font-bold text-[var(--text-primary)] transition-transform group-hover:scale-110">
              {days}
            </span>
            <span className="font-stat text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Progress bar */}
      {isRunning && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-stat text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Simulating...
            </span>
            <span className="font-stat text-sm text-[var(--accent-secondary)]">
              {progressPct}%
            </span>
          </div>
          <div
            className="h-2 overflow-hidden border border-[var(--border-default)] bg-[var(--surface-overlay)]"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-[var(--accent-secondary)] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default SimulationControls;
