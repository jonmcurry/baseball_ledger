/**
 * NewSeasonPanel
 *
 * Heritage Editorial new season announcement. Clean typographic
 * display with editorial layout.
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
    <div data-testid="new-season-panel" className="space-y-6">
      {/* Season announcement */}
      <div className="vintage-card text-center">
        <p className="font-stat text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
          Opening Day
        </p>
        <p className="mt-2 font-headline text-3xl font-bold text-[var(--text-primary)]">
          Season {seasonYear}
        </p>
        <p className="mt-2 font-body text-sm text-[var(--text-secondary)]">
          Rosters carry over from last season
        </p>
        <div className="mx-auto mt-3 h-px w-24 bg-[var(--accent-secondary)]" />
      </div>

      {/* Action */}
      {isCommissioner ? (
        <div className="text-center">
          <button
            type="button"
            onClick={onStartSeason}
            disabled={isStarting}
            className="btn-vintage-primary"
          >
            {isStarting ? 'Starting Season...' : 'Play Ball!'}
          </button>
          <p className="mt-2 font-stat text-xs text-[var(--text-secondary)]">
            Generates full 162-game schedule
          </p>
        </div>
      ) : (
        <p className="text-center font-stat text-xs text-[var(--text-secondary)]">
          Waiting for the commissioner to start the season.
        </p>
      )}
    </div>
  );
}

export default NewSeasonPanel;
