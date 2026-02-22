/**
 * ResultsTicker
 *
 * Heritage Editorial scoreboard strip. Each game result rendered as a
 * clean typographic card with thin rule dividers and monospace scores.
 *
 * Design: "Press Box Wire" -- evokes the hand-typeset box scores of
 * a premium 1920s newspaper sports section.
 *
 * Layer 6: Presentational component. No store or hook imports.
 */

export interface TickerResult {
  readonly gameId: string;
  readonly awayName: string;
  readonly homeName: string;
  readonly awayScore: number;
  readonly homeScore: number;
}

export interface ResultsTickerProps {
  results: readonly TickerResult[];
  onGameClick?: (gameId: string) => void;
}

export function ResultsTicker({ results, onGameClick }: ResultsTickerProps) {
  if (results.length === 0) return null;

  return (
    <div data-testid="results-ticker" className="relative">
      {/* Top rail */}
      <div
        className="flex items-center gap-2 px-4 py-1.5 border-t border-b border-[var(--border-default)]"
      >
        <span className="font-body text-[10px] uppercase tracking-[0.3em] text-[var(--text-secondary)] font-semibold">
          Scoreboard
        </span>
        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
        <span className="font-stat text-[10px] text-[var(--text-tertiary)]">
          {results.length} game{results.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Scoreboard strip */}
      <div className="relative overflow-hidden bg-[var(--surface-raised)]">
        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8" style={{
          background: 'linear-gradient(90deg, var(--surface-raised) 0%, transparent 100%)',
        }} />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8" style={{
          background: 'linear-gradient(270deg, var(--surface-raised) 0%, transparent 100%)',
        }} />

        {/* Scrollable card rail */}
        <div className="flex gap-4 overflow-x-auto px-6 py-4 scrollbar-hide snap-x snap-mandatory">
          {results.map((r) => {
            const awayWon = r.awayScore > r.homeScore;
            const homeWon = r.homeScore > r.awayScore;

            return (
              <button
                key={r.gameId}
                type="button"
                onClick={() => onGameClick?.(r.gameId)}
                className="group snap-start shrink-0 transition-opacity duration-200 hover:opacity-80"
              >
                {/* Card body */}
                <div
                  className="relative w-52 overflow-hidden border border-[var(--border-default)] bg-[var(--surface-raised)]"
                >
                  {/* Score grid */}
                  <div className="relative px-3 pt-3 pb-2.5">
                    {/* Away line */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-[90px] truncate text-left font-body text-xs tracking-wide ${
                          awayWon
                            ? 'text-[var(--text-primary)] font-semibold'
                            : 'text-[var(--text-tertiary)]'
                        }`}
                      >
                        {r.awayName}
                      </span>
                      {awayWon && (
                        <span className="flex h-3 w-3 items-center justify-center text-[7px] font-bold text-[var(--accent-secondary)]">
                          W
                        </span>
                      )}
                      <span className={`ml-auto font-scoreboard text-xl tabular-nums ${
                        awayWon ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
                      }`}>
                        {r.awayScore}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="my-1.5 h-px bg-[var(--border-subtle)]" />

                    {/* Home line */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-[90px] truncate text-left font-body text-xs tracking-wide ${
                          homeWon
                            ? 'text-[var(--text-primary)] font-semibold'
                            : 'text-[var(--text-tertiary)]'
                        }`}
                      >
                        {r.homeName}
                      </span>
                      {homeWon && (
                        <span className="flex h-3 w-3 items-center justify-center text-[7px] font-bold text-[var(--accent-secondary)]">
                          W
                        </span>
                      )}
                      <span className={`ml-auto font-scoreboard text-xl tabular-nums ${
                        homeWon ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
                      }`}>
                        {r.homeScore}
                      </span>
                    </div>
                  </div>

                  {/* Footer bar */}
                  <div className="flex items-center justify-between px-3 py-1 border-t border-[var(--border-subtle)]">
                    <span className="font-stat text-[8px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                      Final
                    </span>
                    <span className="font-stat text-[8px] text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100">
                      View Box Score
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom rule */}
      <div className="h-px bg-[var(--border-default)]" />
    </div>
  );
}

export default ResultsTicker;
