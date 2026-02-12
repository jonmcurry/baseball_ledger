/**
 * BenchPanel
 *
 * Bench player list with "move to lineup" action.
 * Feature-scoped sub-component. No store imports.
 */

import type { RosterEntry } from '@lib/types/roster';

export interface BenchPanelProps {
  readonly bench: readonly RosterEntry[];
  readonly onPlayerSelect: (entry: RosterEntry) => void;
  readonly onPlayerClick?: (entry: RosterEntry) => void;
}

export function BenchPanel({ bench, onPlayerSelect, onPlayerClick }: BenchPanelProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-headline text-sm font-bold text-ballpark">Bench</h3>
      {bench.length === 0 && (
        <p className="text-xs text-muted">No players on bench</p>
      )}
      <div className="space-y-1">
        {bench.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between rounded-card border border-sandstone/50 px-2 py-1"
          >
            <div className="flex items-center gap-2">
              {onPlayerClick ? (
                <button
                  type="button"
                  className="text-sm font-medium text-ballpark underline-offset-2 hover:underline"
                  onClick={() => onPlayerClick(entry)}
                >
                  {entry.playerCard.nameFirst} {entry.playerCard.nameLast}
                </button>
              ) : (
                <span className="text-sm font-medium text-ink">
                  {entry.playerCard.nameFirst} {entry.playerCard.nameLast}
                </span>
              )}
              <span className="font-stat text-xs text-muted">
                {entry.playerCard.primaryPosition}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onPlayerSelect(entry)}
              className="rounded-button bg-ballpark px-2 py-0.5 text-xs text-ink hover:opacity-90"
            >
              Add to Lineup
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BenchPanel;
