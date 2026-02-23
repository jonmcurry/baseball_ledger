/**
 * SimulationControls
 *
 * Inline toolbar for advancing the simulation. Compact button row
 * with progress bar that appears during simulation.
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
      {/* Compact button row */}
      <div className="toolbar-group">
        {availableScopes.map(({ scope, label }) => (
          <button
            key={scope}
            type="button"
            disabled={isRunning}
            onClick={() => onSimulate(scope)}
            className="toolbar-btn"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Progress bar (shown during simulation) */}
      {isRunning && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <div
              className="h-1.5 flex-1 overflow-hidden bg-[var(--surface-overlay)]"
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
            <span className="font-stat text-[10px] text-[var(--accent-secondary)] tabular-nums">
              {progressPct}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default SimulationControls;
