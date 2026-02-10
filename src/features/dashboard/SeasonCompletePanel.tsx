/**
 * SeasonCompletePanel
 *
 * Displays champion announcement, stamp animation, and archive button
 * when the league status is 'completed' (after World Series).
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
    <div data-testid="season-complete-panel" className="space-y-4">
      <StampAnimation isVisible={true} text="SEASON COMPLETED" />

      <div className="rounded-card border-2 border-ballpark bg-ballpark/10 px-gutter py-4 text-center">
        <p className="text-xs font-medium text-muted">World Series Champion</p>
        <p className="font-headline text-xl font-bold text-ballpark">
          {championName}
        </p>
      </div>

      {isCommissioner ? (
        <button
          type="button"
          onClick={onArchive}
          disabled={isArchiving}
          className="rounded-button bg-ballpark px-4 py-2 text-sm font-medium text-old-lace disabled:opacity-50"
        >
          {isArchiving ? 'Archiving...' : 'Archive Season & Start New'}
        </button>
      ) : (
        <p className="text-xs text-muted">
          The commissioner will archive this season when ready.
        </p>
      )}
    </div>
  );
}

export default SeasonCompletePanel;
