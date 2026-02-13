/**
 * BattingOrder
 *
 * Numbered 1-9 batting order list with move up/down and bench buttons.
 * Feature-scoped sub-component. No store imports.
 */

import type { RosterEntry } from '@lib/types/roster';

/** Position-group color coding */
function positionBadgeClass(pos: string | null): string {
  if (!pos) return 'position-badge-dh';
  if (['SP', 'RP', 'CL'].includes(pos)) return 'position-badge-pitcher';
  if (pos === 'C') return 'position-badge-catcher';
  if (['1B', '2B', '3B', 'SS'].includes(pos)) return 'position-badge-infield';
  if (['LF', 'CF', 'RF', 'OF'].includes(pos)) return 'position-badge-outfield';
  return 'position-badge-dh';
}

export interface BattingOrderProps {
  readonly starters: readonly RosterEntry[];
  readonly onMoveUp: (entry: RosterEntry) => void;
  readonly onMoveDown: (entry: RosterEntry) => void;
  readonly onRemove: (entry: RosterEntry) => void;
  readonly onPlayerClick?: (entry: RosterEntry) => void;
}

export function BattingOrder({
  starters,
  onMoveUp,
  onMoveDown,
  onRemove,
  onPlayerClick,
}: BattingOrderProps) {
  return (
    <div className="vintage-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="pennant-header text-base">Batting Order</h3>
        <span className="font-stat text-xs text-muted">
          {starters.length} batter{starters.length !== 1 ? 's' : ''}
        </span>
      </div>

      {starters.length === 0 && (
        <p className="py-4 text-center text-sm text-muted">
          No batting order set. Assign players from the bench.
        </p>
      )}

      <div className="space-y-1">
        {starters.map((entry, idx) => (
          <div
            key={entry.id}
            className="group flex items-center gap-2 rounded-card border border-transparent px-2 py-1.5 transition-colors hover:border-[var(--border-default)] hover:bg-[var(--surface-overlay)]"
          >
            {/* Batting order number */}
            <span className="w-6 shrink-0 text-right font-stat text-sm font-semibold text-accent">
              {idx + 1}
            </span>

            {/* Position badge */}
            <span className={`position-badge w-8 shrink-0 text-center ${positionBadgeClass(entry.lineupPosition)}`}>
              {entry.lineupPosition ?? '?'}
            </span>

            {/* Player name */}
            {onPlayerClick ? (
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left font-body text-sm font-medium text-[var(--text-primary)] underline-offset-2 hover:underline"
                onClick={() => onPlayerClick(entry)}
              >
                {entry.playerCard.nameFirst} {entry.playerCard.nameLast}
              </button>
            ) : (
              <span className="min-w-0 flex-1 truncate font-body text-sm font-medium text-[var(--text-primary)]">
                {entry.playerCard.nameFirst} {entry.playerCard.nameLast}
              </span>
            )}

            {/* Action buttons -- visible on hover */}
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onMoveUp(entry)}
                disabled={idx === 0}
                className="rounded px-1 py-0.5 text-xs text-muted hover:bg-[var(--surface-highlight)] hover:text-[var(--text-primary)] disabled:opacity-30"
                aria-label={`Move ${entry.playerCard.nameLast} up`}
                title="Move up"
              >
                &#9650;
              </button>
              <button
                type="button"
                onClick={() => onMoveDown(entry)}
                disabled={idx === starters.length - 1}
                className="rounded px-1 py-0.5 text-xs text-muted hover:bg-[var(--surface-highlight)] hover:text-[var(--text-primary)] disabled:opacity-30"
                aria-label={`Move ${entry.playerCard.nameLast} down`}
                title="Move down"
              >
                &#9660;
              </button>
              <button
                type="button"
                onClick={() => onRemove(entry)}
                className="rounded px-1 py-0.5 text-xs text-[var(--semantic-danger)] hover:bg-[var(--semantic-danger)]/10"
                aria-label={`Remove ${entry.playerCard.nameLast} from lineup`}
                title="Move to bench"
              >
                &#10005;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BattingOrder;
