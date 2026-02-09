/**
 * SimulationControls
 *
 * Button panel for advancing the simulation: Day, Week, Month, Season.
 * Disabled when simulation is running.
 */

export interface SimulationControlsProps {
  isRunning: boolean;
  progressPct: number;
  onSimulate: (scope: 'day' | 'week' | 'month' | 'season') => void;
}

const SCOPES: { scope: 'day' | 'week' | 'month' | 'season'; label: string }[] = [
  { scope: 'day', label: 'Sim Day' },
  { scope: 'week', label: 'Sim Week' },
  { scope: 'month', label: 'Sim Month' },
  { scope: 'season', label: 'Sim Season' },
];

export function SimulationControls({
  isRunning,
  progressPct,
  onSimulate,
}: SimulationControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {SCOPES.map(({ scope, label }) => (
          <button
            key={scope}
            type="button"
            disabled={isRunning}
            onClick={() => onSimulate(scope)}
            className="rounded-button bg-ballpark px-4 py-2 text-sm font-medium text-old-lace hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {label}
          </button>
        ))}
      </div>
      {isRunning && (
        <div className="flex items-center gap-2" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-sandstone/30">
            <div
              className="h-full rounded-full bg-ballpark transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="font-stat text-xs text-muted">{progressPct}%</span>
        </div>
      )}
    </div>
  );
}
