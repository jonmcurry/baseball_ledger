/**
 * ResultsTicker
 *
 * Heritage Editorial broadsheet column. Game results rendered as a
 * narrow, centrally-aligned vertical text stream with staggered
 * fade-in animation. Replaces horizontal card rail per Section 3.3.
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
    <div data-testid="results-ticker">
      {/* Header */}
      <div className="mb-gutter text-center">
        <h3 className="font-headline text-lg font-bold tracking-tight text-[var(--text-primary)]">
          Scoreboard
        </h3>
        <div className="mx-auto mt-1 h-px w-16 bg-[var(--accent-secondary)]" />
        <p className="mt-1 font-stat text-[10px] text-[var(--text-tertiary)]">
          {results.length} game{results.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Vertical text stream */}
      <div className="mx-auto max-w-2xl space-y-1">
        {results.map((r, idx) => {
          const awayWon = r.awayScore > r.homeScore;
          const homeWon = r.homeScore > r.awayScore;

          return (
            <button
              key={r.gameId}
              type="button"
              onClick={() => onGameClick?.(r.gameId)}
              className="ticker-entry block w-full py-2 text-center border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--accent-muted)]"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <span className="font-body text-sm">
                <span
                  className={
                    awayWon
                      ? 'font-semibold text-[var(--text-primary)]'
                      : 'text-[var(--text-tertiary)]'
                  }
                >
                  {r.awayName}
                </span>
                {' '}
                <span className="font-stat text-base tabular-nums text-[var(--text-primary)]">
                  {r.awayScore}
                </span>
                <span className="mx-2 text-[var(--text-tertiary)]">&ndash;</span>
                <span className="font-stat text-base tabular-nums text-[var(--text-primary)]">
                  {r.homeScore}
                </span>
                {' '}
                <span
                  className={
                    homeWon
                      ? 'font-semibold text-[var(--text-primary)]'
                      : 'text-[var(--text-tertiary)]'
                  }
                >
                  {r.homeName}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom rule */}
      <div className="mt-gutter h-px bg-[var(--border-default)]" />
    </div>
  );
}

export default ResultsTicker;
