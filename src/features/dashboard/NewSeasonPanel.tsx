/**
 * NewSeasonPanel
 *
 * Displays season heading and "Start Season" button for the commissioner
 * when a league is in 'setup' status after archive (season_year > 1).
 * Non-commissioners see a waiting message.
 *
 * REQ-SCH-009: "rosters remain, new schedule generated"
 *
 * Layer 7: Feature component. Presentational only.
 */

export interface NewSeasonPanelProps {
  seasonYear: number;
  isCommissioner: boolean;
  onStartSeason: () => void;
  isStarting: boolean;
}

export function NewSeasonPanel({
  seasonYear,
  isCommissioner,
  onStartSeason,
  isStarting,
}: NewSeasonPanelProps) {
  return (
    <div data-testid="new-season-panel" className="space-y-4">
      <div className="rounded-card border-2 border-ballpark bg-ballpark/10 px-gutter py-4 text-center">
        <p className="font-headline text-xl font-bold text-ballpark">
          Season {seasonYear}
        </p>
        <p className="mt-1 text-xs text-muted">
          Rosters carry over from last season.
        </p>
      </div>

      {isCommissioner ? (
        <button
          type="button"
          onClick={onStartSeason}
          disabled={isStarting}
          className="rounded-button bg-ballpark px-4 py-2 text-sm font-medium text-old-lace disabled:opacity-50"
        >
          {isStarting ? 'Starting Season...' : 'Start Season'}
        </button>
      ) : (
        <p className="text-xs text-muted">
          Waiting for the commissioner to start the season.
        </p>
      )}
    </div>
  );
}

export default NewSeasonPanel;
