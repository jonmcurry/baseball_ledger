/**
 * ResultsTicker
 *
 * Scoreboard strip: dark navy bar with horizontal scrollable score chips.
 * ESPN-style compact game results.
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
    <div data-testid="results-ticker" className="scoreboard-strip">
      {results.map((r, idx) => {
        const awayWon = r.awayScore > r.homeScore;
        const homeWon = r.homeScore > r.awayScore;

        return (
          <button
            key={r.gameId}
            type="button"
            onClick={() => onGameClick?.(r.gameId)}
            className="ticker-entry score-chip"
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <span
              className={`score-chip-team ${
                awayWon ? 'text-[var(--text-on-dark)]' : 'text-[var(--text-on-dark-muted)]'
              }`}
            >
              {r.awayName}
            </span>
            <span className="score-chip-score tabular-nums">
              {r.awayScore}
            </span>
            <span className="text-[var(--text-on-dark-muted)] text-[10px]">-</span>
            <span className="score-chip-score tabular-nums">
              {r.homeScore}
            </span>
            <span
              className={`score-chip-team ${
                homeWon ? 'text-[var(--text-on-dark)]' : 'text-[var(--text-on-dark-muted)]'
              }`}
            >
              {r.homeName}
            </span>
            <span className="score-chip-status">F</span>
          </button>
        );
      })}
    </div>
  );
}

export default ResultsTicker;
