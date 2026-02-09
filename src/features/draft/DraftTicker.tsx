/**
 * DraftTicker
 *
 * Vertical scrolling list of draft picks.
 * Feature-scoped sub-component. No store imports.
 */

import type { DraftPickResult } from '@lib/types/draft';

export interface DraftTickerProps {
  picks: readonly DraftPickResult[];
  currentPick: number;
}

export function DraftTicker({ picks, currentPick }: DraftTickerProps) {
  return (
    <div className="space-y-1" role="log" aria-label="Draft picks">
      <h3 className="font-headline text-sm font-bold text-ballpark">Draft Ticker</h3>
      {picks.length === 0 && (
        <p className="text-xs text-muted">No picks yet</p>
      )}
      <div className="max-h-96 space-y-1 overflow-y-auto">
        {picks.map((pick) => (
          <div
            key={`${pick.round}-${pick.pick}`}
            className={`flex items-center justify-between rounded-card border px-2 py-1 text-xs ${
              pick.pick === currentPick ? 'border-ballpark bg-ballpark/10' : 'border-sandstone/50'
            }`}
          >
            <span className="font-stat text-muted">
              R{pick.round}.{pick.pick}
            </span>
            <span className="font-medium text-ink">{pick.playerName}</span>
            <span className="text-muted">{pick.position}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
