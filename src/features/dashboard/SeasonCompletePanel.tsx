/**
 * SeasonCompletePanel
 *
 * Heritage Editorial championship announcement. Clean typographic
 * display with stamp animation and broadsheet styling.
 *
 * REQ-SCH-009: Season completion ceremony with stamp animation.
 *
 * Layer 7: Feature component. Presentational only.
 */

import { StampAnimation } from '@components/feedback/StampAnimation';

export interface SeasonCompletePanelProps {
  championName: string;
  isCommissioner: boolean;
  onArchive: () => void;
  isArchiving: boolean;
}

export function SeasonCompletePanel({
  championName,
  isCommissioner,
  onArchive,
  isArchiving,
}: SeasonCompletePanelProps) {
  return (
    <div data-testid="season-complete-panel" className="space-y-6">
      <StampAnimation isVisible={true} text="SEASON COMPLETED" />

      {/* Champion display */}
      <div className="vintage-card text-center">
        <p className="font-stat text-xs uppercase tracking-widest text-[var(--text-tertiary)]">
          World Series Champion
        </p>
        <p className="mt-2 font-headline text-3xl font-bold text-[var(--accent-secondary)]">
          {championName}
        </p>
        <div className="mx-auto mt-3 h-px w-24 bg-[var(--accent-secondary)]" />
      </div>

      {/* Archive action */}
      {isCommissioner ? (
        <div className="text-center">
          <button
            type="button"
            onClick={onArchive}
            disabled={isArchiving}
            className="btn-vintage-primary"
          >
            {isArchiving ? 'Archiving Season...' : 'Archive Season & Start New'}
          </button>
          <p className="mt-2 font-stat text-xs text-[var(--text-secondary)]">
            Rosters will carry over to the new season
          </p>
        </div>
      ) : (
        <p className="text-center font-stat text-xs text-[var(--text-secondary)]">
          The commissioner will archive this season when ready.
        </p>
      )}
    </div>
  );
}

export default SeasonCompletePanel;
