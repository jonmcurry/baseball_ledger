/**
 * ResultsTicker
 *
 * Horizontal score strip showing game results as inline scrollable items.
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
      <div className="flex overflow-x-auto gap-0" style={{ scrollbarWidth: 'none' }}>
        {results.map((r, idx) => {
          const awayWon = r.awayScore > r.homeScore;
          const homeWon = r.homeScore > r.awayScore;

          return (
            <button
              key={r.gameId}
              type="button"
              onClick={() => onGameClick?.(r.gameId)}
              className="ticker-entry flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap border-r border-[var(--border-subtle)] transition-colors hover:bg-[var(--accent-muted)] flex-shrink-0"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <span
                className={`font-body text-xs ${
                  awayWon ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
                }`}
              >
                {r.awayName}
              </span>
              <span className="font-stat text-sm tabular-nums font-bold text-[var(--text-primary)]">
                {r.awayScore}
              </span>
              <span className="text-[var(--text-tertiary)] text-xs">-</span>
              <span className="font-stat text-sm tabular-nums font-bold text-[var(--text-primary)]">
                {r.homeScore}
              </span>
              <span
                className={`font-body text-xs ${
                  homeWon ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
                }`}
              >
                {r.homeName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ResultsTicker;
