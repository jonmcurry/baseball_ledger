/**
 * ResultsTicker
 *
 * Vintage ballpark scoreboard strip. Each game result rendered as a
 * miniature riveted-metal scoreboard card with physical depth, warm
 * stadium lighting, and hand-stenciled team lettering.
 *
 * Design: "Press Box Wire" -- evokes the manual scoreboards at
 * Fenway, Wrigley, and old Comiskey under the lights.
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
      {/* Top rail -- riveted strip */}
      <div
        className="flex items-center gap-2 px-4 py-1"
        style={{
          background: 'linear-gradient(180deg, var(--surface-overlay) 0%, var(--surface-raised) 100%)',
          borderTop: '2px solid var(--accent-primary)',
        }}
      >
        <span className="font-display text-[10px] uppercase tracking-[0.3em] text-[var(--accent-primary)]">
          Scoreboard
        </span>
        <div className="h-px flex-1 bg-[var(--accent-primary)]/20" />
        <span className="font-stat text-[10px] text-[var(--text-tertiary)]">
          {results.length} game{results.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Scoreboard strip */}
      <div className="relative overflow-hidden" style={{
        background: 'linear-gradient(180deg, var(--surface-highlight) 0%, var(--surface-overlay) 40%, var(--surface-base) 100%)',
        borderBottom: '2px solid var(--accent-primary)',
      }}>
        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10" style={{
          background: 'linear-gradient(90deg, var(--surface-overlay) 0%, transparent 100%)',
        }} />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10" style={{
          background: 'linear-gradient(270deg, var(--surface-overlay) 0%, transparent 100%)',
        }} />

        {/* Scrollable card rail */}
        <div className="flex gap-3 overflow-x-auto px-6 py-4 scrollbar-hide snap-x snap-mandatory">
          {results.map((r) => {
            const awayWon = r.awayScore > r.homeScore;
            const homeWon = r.homeScore > r.awayScore;

            return (
              <button
                key={r.gameId}
                type="button"
                onClick={() => onGameClick?.(r.gameId)}
                className="group snap-start shrink-0 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
              >
                {/* Card body */}
                <div
                  className="relative w-52 overflow-hidden rounded"
                  style={{
                    background: 'linear-gradient(160deg, var(--surface-raised) 0%, var(--surface-overlay) 50%, var(--surface-highlight) 100%)',
                    boxShadow: `
                      inset 0 1px 0 rgba(255,255,255,0.4),
                      inset 0 -1px 0 rgba(0,0,0,0.05),
                      0 2px 8px rgba(0,0,0,0.08),
                      0 0 1px rgba(27,77,62,0.15)
                    `,
                    border: '1px solid var(--border-default)',
                  }}
                >
                  {/* Hover glow */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background: 'radial-gradient(ellipse at 50% 0%, rgba(27,77,62,0.08) 0%, transparent 70%)',
                    }}
                  />

                  {/* Score grid */}
                  <div className="relative px-3 pt-2.5 pb-2">
                    {/* Away line */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-[90px] truncate text-left font-display text-xs uppercase tracking-wide ${
                          awayWon
                            ? 'text-[var(--text-primary)]'
                            : 'text-[var(--text-tertiary)]'
                        }`}
                      >
                        {r.awayName}
                      </span>
                      {awayWon && (
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7px] font-bold"
                          style={{
                            background: 'var(--accent-primary)',
                            color: 'var(--surface-raised)',
                          }}
                        >
                          W
                        </span>
                      )}
                      <span className="ml-auto font-scoreboard text-xl tabular-nums"
                        style={{
                          color: awayWon ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          textShadow: awayWon
                            ? '0 0 12px rgba(27,77,62,0.3), 0 0 4px rgba(27,77,62,0.2)'
                            : 'none',
                        }}
                      >
                        {r.awayScore}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="my-1 h-px" style={{
                      background: 'linear-gradient(90deg, transparent 0%, var(--border-subtle) 20%, var(--border-subtle) 80%, transparent 100%)',
                    }} />

                    {/* Home line */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-[90px] truncate text-left font-display text-xs uppercase tracking-wide ${
                          homeWon
                            ? 'text-[var(--text-primary)]'
                            : 'text-[var(--text-tertiary)]'
                        }`}
                      >
                        {r.homeName}
                      </span>
                      {homeWon && (
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7px] font-bold"
                          style={{
                            background: 'var(--accent-primary)',
                            color: 'var(--surface-raised)',
                          }}
                        >
                          W
                        </span>
                      )}
                      <span className="ml-auto font-scoreboard text-xl tabular-nums"
                        style={{
                          color: homeWon ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          textShadow: homeWon
                            ? '0 0 12px rgba(27,77,62,0.3), 0 0 4px rgba(27,77,62,0.2)'
                            : 'none',
                        }}
                      >
                        {r.homeScore}
                      </span>
                    </div>
                  </div>

                  {/* Footer bar */}
                  <div
                    className="flex items-center justify-between px-3 py-1"
                    style={{
                      background: 'rgba(0,0,0,0.04)',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
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
    </div>
  );
}

export default ResultsTicker;
