/**
 * DraftTicker
 *
 * Vintage scoreboard-style draft pick feed.
 * Golden era aesthetic with inning-by-inning styling.
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
      className="scoreboard-panel"
      role="log"
      aria-live="polite"
      aria-label="Draft pick feed"
    >
      {/* Header with pennant styling */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-ink)]/30">
          <svg
            className="h-4 w-4 text-[var(--color-gold)]"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5h3V8h4v4h3l-5 5z" />
          </svg>
        </div>
        <div>
          <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-[var(--color-scoreboard-text)]">
            Draft Ticker
          </h3>
          <p className="font-stat text-xs text-[var(--color-scoreboard-text)]/60">
            {picks.length} pick{picks.length !== 1 ? 's' : ''} made
          </p>
        </div>
      </div>

      {picks.length === 0 && (
        <div className="flex items-center justify-center py-6">
          <p className="font-stat text-xs text-[var(--color-scoreboard-text)]/50">
            Waiting for first pick...
          </p>
        </div>
      )}

      {/* Pick list - scrollable */}
      <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
        {reversedPicks.map((pick, idx) => {
          const isLatest = idx === 0;
          const isCurrent = pick.pick === currentPick;

          return (
            <div
              key={`${pick.round}-${pick.pick}`}
              className={`group flex items-center gap-2 rounded border px-2 py-1.5 transition-all ${
                isLatest
                  ? 'animate-glow border-[var(--color-gold)]/50 bg-[var(--color-gold)]/10'
                  : isCurrent
                    ? 'border-[var(--color-scoreboard-text)]/30 bg-[var(--color-scoreboard-green)]/50'
                    : 'border-[var(--color-ink)]/20 bg-[var(--color-ink)]/10 hover:border-[var(--color-scoreboard-text)]/30'
              }`}
              style={{
                animationDelay: isLatest ? '0s' : undefined,
              }}
            >
              {/* Round.Pick badge */}
              <div
                className={`flex h-6 min-w-[2.5rem] items-center justify-center rounded font-scoreboard text-xs font-bold ${
                  isLatest
                    ? 'bg-[var(--color-gold)] text-[var(--color-ink)]'
                    : 'bg-[var(--color-ink)]/30 text-[var(--color-scoreboard-text)]'
                }`}
              >
                {pick.round}.{pick.pick}
              </div>

              {/* Player info */}
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate font-headline text-xs font-bold ${
                    isLatest
                      ? 'text-[var(--color-gold)]'
                      : 'text-[var(--color-scoreboard-text)]'
                  }`}
                >
                  {pick.playerName}
                </p>
                <p className="font-stat text-[10px] text-[var(--color-scoreboard-text)]/60">
                  Pick #{pick.pick}
                </p>
              </div>

              {/* Position badge */}
              <div
                className={`rounded px-1.5 py-0.5 font-stat text-[10px] font-bold uppercase ${
                  ['SP', 'RP'].includes(pick.position)
                    ? 'bg-[var(--color-leather)]/30 text-[var(--color-leather)]'
                    : 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
                }`}
              >
                {pick.position}
              </div>
            </div>
          );
        })}
      </div>

      {/* Decorative footer */}
      {picks.length > 0 && (
        <div className="mt-3 border-t border-[var(--color-ink)]/20 pt-2">
          <p className="text-center font-stat text-[10px] uppercase tracking-widest text-[var(--color-scoreboard-text)]/40">
            ★ Most Recent Selections ★
          </p>
        </div>
      )}
    </div>
  );
}

export default DraftTicker;
