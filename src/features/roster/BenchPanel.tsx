/**
 * BenchPanel
 *
 * Bench player list with "add to lineup" action.
 * When a position is selected on the diamond, highlights matching players.
 * Feature-scoped sub-component. No store imports.
 */

import type { RosterEntry } from '@lib/types/roster';

/** Position-group color coding */
function positionBadgeClass(pos: string): string {
  if (['SP', 'RP', 'CL'].includes(pos)) return 'position-badge-pitcher';
  if (pos === 'C') return 'position-badge-catcher';
  if (['1B', '2B', '3B', 'SS'].includes(pos)) return 'position-badge-infield';
  if (['LF', 'CF', 'RF', 'OF'].includes(pos)) return 'position-badge-outfield';
  return 'position-badge-dh';
}

/** Check if a player can fill a given position */
function canFillPosition(entry: RosterEntry, position: string | null): boolean {
  if (!position) return true;
  const primary = entry.playerCard.primaryPosition;
  if (primary === position) return true;
  // OF can fill LF/CF/RF
  if (primary === 'OF' && ['LF', 'CF', 'RF'].includes(position)) return true;
  // Any position player can DH
  if (position === 'DH' && !entry.playerCard.isPitcher) return true;
  return false;
}

export interface BenchPanelProps {
  readonly bench: readonly RosterEntry[];
  readonly selectedPosition: string | null;
  readonly onPlayerSelect: (entry: RosterEntry) => void;
  readonly onPlayerClick?: (entry: RosterEntry) => void;
}

export function BenchPanel({
  bench,
  selectedPosition,
  onPlayerSelect,
  onPlayerClick,
}: BenchPanelProps) {
  return (
    <div className="vintage-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="pennant-header text-base">Bench</h3>
        <span className="font-stat text-xs text-muted">
          {bench.length} player{bench.length !== 1 ? 's' : ''}
        </span>
      </div>

      {bench.length === 0 && (
        <p className="py-4 text-center text-sm text-muted">No players on bench</p>
      )}

      <div className="space-y-1">
        {bench.map((entry) => {
          const fits = canFillPosition(entry, selectedPosition);
          return (
            <div
              key={entry.id}
              className={`flex items-center justify-between rounded-card border px-2 py-1.5 transition-colors ${
                selectedPosition && fits
                  ? 'border-accent/40 bg-accent/5'
                  : selectedPosition && !fits
                    ? 'border-transparent opacity-40'
                    : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className={`position-badge shrink-0 ${positionBadgeClass(entry.playerCard.primaryPosition)}`}>
                  {entry.playerCard.primaryPosition}
                </span>
                {onPlayerClick ? (
                  <button
                    type="button"
                    className="min-w-0 truncate text-left font-body text-sm font-medium text-[var(--text-primary)] underline-offset-2 hover:underline"
                    onClick={() => onPlayerClick(entry)}
                  >
                    {entry.playerCard.nameFirst} {entry.playerCard.nameLast}
                  </button>
                ) : (
                  <span className="min-w-0 truncate font-body text-sm font-medium text-[var(--text-primary)]">
                    {entry.playerCard.nameFirst} {entry.playerCard.nameLast}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onPlayerSelect(entry)}
                disabled={selectedPosition != null && !fits}
                className="btn-vintage btn-vintage-gold shrink-0 px-2 py-0.5 text-xs disabled:opacity-30"
              >
                {selectedPosition ? `Add ${selectedPosition}` : 'Add to Lineup'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BenchPanel;
