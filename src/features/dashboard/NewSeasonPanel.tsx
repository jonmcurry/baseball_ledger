/**
 * NewSeasonPanel
 *
 * Vintage pennant-style new season announcement panel.
 * Golden era aesthetic with opening day celebration feel.
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
      {/* Season announcement card */}
      <div
        className="vintage-card relative overflow-hidden text-center"
        style={{
          background: 'linear-gradient(135deg, var(--color-scoreboard-green) 0%, #0A1520 100%)',
          borderColor: 'var(--color-gold)',
          borderWidth: '2px',
        }}
      >
        {/* Decorative corners */}
        <div className="absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-[var(--color-gold)]/50" />
        <div className="absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-[var(--color-gold)]/50" />
        <div className="absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-[var(--color-gold)]/50" />
        <div className="absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-[var(--color-gold)]/50" />

        {/* Season icon */}
        <div className="mb-3 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-gold)]/20">
            <svg
              className="h-6 w-6 text-[var(--color-gold)]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
            </svg>
          </div>
        </div>

        <p className="mb-1 font-stat text-xs uppercase tracking-widest text-[var(--color-scoreboard-text)]/60">
          Opening Day
        </p>
        <p
          className="font-headline text-3xl font-bold uppercase tracking-wider text-[var(--color-gold)]"
          style={{
            textShadow: '0 0 15px var(--color-gold), 0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          Season {seasonYear}
        </p>
        <p className="mt-2 font-stat text-sm text-[var(--color-scoreboard-text)]/70">
          Rosters carry over from last season
        </p>

        {/* Decorative stars */}
        <div className="mt-4 flex justify-center gap-1">
          {[...Array(3)].map((_, i) => (
            <svg
              key={i}
              className="h-3 w-3 text-[var(--color-gold)]/50"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          ))}
        </div>
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
          <p className="mt-2 font-stat text-xs text-[var(--color-muted)]">
            Generates full 162-game schedule
          </p>
        </div>
      ) : (
        <p className="text-center font-stat text-xs text-[var(--color-muted)]">
          Waiting for the commissioner to start the season.
        </p>
      )}
    </div>
  );
}

export default NewSeasonPanel;
