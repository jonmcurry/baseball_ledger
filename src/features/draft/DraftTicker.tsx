/**
 * DraftTicker
 *
 * Heritage Editorial draft pick feed. Clean typographic list
 * with crimson accent for latest pick.
 * Feature-scoped sub-component. No store imports.
 */

import type { DraftPickResult } from '@lib/types/draft';

export interface DraftTickerProps {
  picks: readonly DraftPickResult[];
  currentPick: number;
}

export function DraftTicker({ picks, currentPick }: DraftTickerProps) {
  // Group picks by round for display
  const reversedPicks = [...picks].reverse();

  return (
    <div
      className="border-t border-b border-[var(--border-default)] bg-[var(--surface-raised)] py-gutter px-gutter"
      role="log"
      aria-live="polite"
      aria-label="Draft pick feed"
    >
      {/* Header */}
      <div className="mb-3">
        <h3 className="font-headline text-sm font-bold text-[var(--text-primary)]">
          Draft Ticker
        </h3>
        <p className="font-stat text-xs text-[var(--text-secondary)]">
          {picks.length} pick{picks.length !== 1 ? 's' : ''} made
        </p>
      </div>

      {picks.length === 0 && (
        <div className="flex items-center justify-center py-6">
          <p className="font-stat text-xs text-[var(--text-tertiary)]">
            Waiting for first pick...
          </p>
        </div>
      )}

      {/* Pick list - scrollable */}
      <div className="max-h-60 space-y-1 overflow-y-auto pr-1">
        {reversedPicks.map((pick, idx) => {
          const isLatest = idx === 0;
          const isCurrent = pick.pick === currentPick;

          return (
            <div
              key={`${pick.round}-${pick.pick}`}
              className={`group flex items-center gap-2 border-b border-[var(--border-subtle)] px-2 py-1.5 transition-all ${
                isLatest
                  ? 'border-l-[3px] border-l-[var(--accent-secondary)]'
                  : isCurrent
                    ? 'bg-[var(--accent-muted)]'
                    : 'hover:bg-[var(--accent-muted)]'
              }`}
            >
              {/* Round.Pick badge */}
              <div
                className={`flex h-6 min-w-[2.5rem] items-center justify-center font-stat text-xs font-bold ${
                  isLatest
                    ? 'bg-[var(--accent-secondary)] text-[var(--cream-white)]'
                    : 'bg-[var(--accent-muted)] text-[var(--text-primary)]'
                }`}
              >
                {pick.round}.{pick.pick}
              </div>

              {/* Player info */}
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate font-body text-xs font-semibold ${
                    isLatest
                      ? 'text-[var(--accent-secondary)]'
                      : 'text-[var(--text-primary)]'
                  }`}
                >
                  {pick.playerName}
                </p>
                <p className="font-stat text-[10px] text-[var(--text-tertiary)]">
                  Pick #{pick.pick}
                </p>
              </div>

              {/* Position badge */}
              <div
                className={`px-1.5 py-0.5 font-stat text-[10px] font-bold uppercase ${
                  ['SP', 'RP'].includes(pick.position)
                    ? 'position-badge position-badge-pitcher'
                    : 'position-badge position-badge-infield'
                }`}
              >
                {pick.position}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DraftTicker;
