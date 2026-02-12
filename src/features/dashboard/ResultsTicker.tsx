/**
 * ResultsTicker
 *
 * Vintage stadium ticker-tape style game results feed.
 * Golden era aesthetic with scrolling scoreboard feel.
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
    <div
      data-testid="results-ticker"
      className="ticker-strip relative overflow-hidden"
    >
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[var(--color-scoreboard-green)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[var(--color-scoreboard-green)] to-transparent" />

      {/* Scrollable content */}
      <div className="flex gap-4 overflow-x-auto px-4 py-2 scrollbar-hide">
        {results.map((r) => {
          const awayWon = r.awayScore > r.homeScore;
          const homeWon = r.homeScore > r.awayScore;

          return (
            <button
              key={r.gameId}
              type="button"
              onClick={() => onGameClick?.(r.gameId)}
              className="group flex shrink-0 items-center gap-3 rounded border border-[var(--color-ink)]/30 bg-[var(--color-ink)]/20 px-3 py-1.5 transition-all hover:border-[var(--color-gold)] hover:bg-[var(--color-gold)]/10"
            >
              {/* Away team */}
              <div className="flex items-center gap-2">
                <span
                  className={`font-headline text-xs uppercase tracking-wider ${
                    awayWon
                      ? 'text-[var(--color-gold)]'
                      : 'text-[var(--color-scoreboard-text)]/70'
                  }`}
                >
                  {r.awayName}
                </span>
                <span
                  className={`font-scoreboard text-lg ${
                    awayWon
                      ? 'text-[var(--color-gold)]'
                      : 'text-[var(--color-scoreboard-text)]'
                  }`}
                  style={{
                    textShadow: awayWon
                      ? '0 0 8px var(--color-gold)'
                      : '0 0 5px var(--color-scoreboard-glow)',
                  }}
                >
                  {r.awayScore}
                </span>
              </div>

              {/* Separator */}
              <span className="font-stat text-xs text-[var(--color-scoreboard-text)]/40">
                @
              </span>

              {/* Home team */}
              <div className="flex items-center gap-2">
                <span
                  className={`font-scoreboard text-lg ${
                    homeWon
                      ? 'text-[var(--color-gold)]'
                      : 'text-[var(--color-scoreboard-text)]'
                  }`}
                  style={{
                    textShadow: homeWon
                      ? '0 0 8px var(--color-gold)'
                      : '0 0 5px var(--color-scoreboard-glow)',
                  }}
                >
                  {r.homeScore}
                </span>
                <span
                  className={`font-headline text-xs uppercase tracking-wider ${
                    homeWon
                      ? 'text-[var(--color-gold)]'
                      : 'text-[var(--color-scoreboard-text)]/70'
                  }`}
                >
                  {r.homeName}
                </span>
              </div>

              {/* Final indicator */}
              <span className="ml-1 rounded bg-[var(--color-ink)]/30 px-1.5 py-0.5 font-stat text-[8px] uppercase tracking-wider text-[var(--color-scoreboard-text)]/60">
                Final
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ResultsTicker;
