/**
 * ResultsTicker
 *
 * Horizontal scrolling game results feed (REQ-UI-007).
 * Displays completed game scores in a compact ticker strip.
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
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {results.map((r) => (
        <button
          key={r.gameId}
          type="button"
          onClick={() => onGameClick?.(r.gameId)}
          className="flex shrink-0 items-center gap-2 rounded-card border border-sandstone/50 px-3 py-1.5 font-stat text-xs hover:bg-sandstone/10"
        >
          <span className="font-medium">{r.awayName}</span>
          <span className="font-bold">{r.awayScore}</span>
          <span className="text-muted">@</span>
          <span className="font-medium">{r.homeName}</span>
          <span className="font-bold">{r.homeScore}</span>
        </button>
      ))}
    </div>
  );
}

export default ResultsTicker;
