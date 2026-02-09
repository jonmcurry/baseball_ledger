/**
 * LineupDiamond
 *
 * Wraps DiamondField with lineup editing capability.
 * Click a position to assign a player from the roster.
 * Feature-scoped sub-component. No store imports.
 */

import { DiamondField } from '@components/baseball/DiamondField';
import type { FieldPosition } from '@components/baseball/DiamondField';
import type { RosterEntry } from '@lib/types/roster';

export interface LineupDiamondProps {
  readonly starters: readonly RosterEntry[];
  readonly roster: readonly RosterEntry[];
  readonly isEditable: boolean;
  readonly onAssign: (position: string) => void;
}

export function LineupDiamond({ starters, isEditable, onAssign }: LineupDiamondProps) {
  const positions: FieldPosition[] = [
    'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'P',
  ].map((pos) => {
    const starter = starters.find((s) => s.lineupPosition === pos);
    return {
      position: pos,
      playerName: starter
        ? `${starter.playerCard.nameFirst} ${starter.playerCard.nameLast}`
        : '',
    };
  });

  return (
    <div className="space-y-2">
      <h3 className="font-headline text-sm font-bold text-ballpark">Lineup</h3>
      <DiamondField
        positions={positions}
        isEditable={isEditable}
        onPositionClick={onAssign}
      />
      <div className="flex flex-wrap gap-2">
        {starters.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-1 rounded-card border border-sandstone/50 px-2 py-0.5 text-xs"
          >
            <span className="font-stat text-muted">{s.lineupOrder}.</span>
            <span className="font-medium text-ink">
              {s.playerCard.nameFirst} {s.playerCard.nameLast}
            </span>
            <span className="text-muted">{s.lineupPosition}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
