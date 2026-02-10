/**
 * RosterPreviewPanel
 *
 * Shows the current team roster during draft.
 * Feature-scoped sub-component. No store imports.
 */

import type { DraftPickResult } from '@lib/types/draft';

export interface RosterPreviewPanelProps {
  picks: readonly DraftPickResult[];
  teamName: string;
  teamId: string;
}

export function RosterPreviewPanel({ picks, teamName, teamId }: RosterPreviewPanelProps) {
  const teamPicks = picks.filter((p) => p.teamId === teamId);

  return (
    <div className="space-y-1">
      <h3 className="font-headline text-sm font-bold text-ballpark">{teamName} Roster</h3>
      <p className="text-xs text-muted">{teamPicks.length} player{teamPicks.length !== 1 ? 's' : ''}</p>

      {teamPicks.length === 0 && (
        <p className="py-2 text-xs text-muted">No picks yet</p>
      )}

      <div className="max-h-64 space-y-1 overflow-y-auto">
        {teamPicks.map((pick) => (
          <div
            key={`${pick.round}-${pick.pick}`}
            className="flex items-center justify-between rounded-card border border-sandstone/50 px-2 py-1 text-xs"
          >
            <span className="font-medium text-ink">{pick.playerName}</span>
            <span className="font-stat text-muted">{pick.position}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RosterPreviewPanel;
