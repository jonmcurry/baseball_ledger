/**
 * LineupDiamond
 *
 * SVG baseball diamond showing defensive positions with current starters.
 * Click a position to select it for bench player assignment.
 * Feature-scoped sub-component. No store imports.
 */

import { DiamondField } from '@components/baseball/DiamondField';
import type { FieldPosition } from '@components/baseball/DiamondField';
import type { RosterEntry } from '@lib/types/roster';

/** Defensive lineup positions (8 field + DH). No pitcher -- DH league. */
const LINEUP_POSITIONS = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH'];

export interface LineupDiamondProps {
  readonly starters: readonly RosterEntry[];
  readonly selectedPosition: string | null;
  readonly onPositionClick: (position: string) => void;
  readonly onPlayerClick?: (entry: RosterEntry) => void;
}

export function LineupDiamond({
  starters,
  selectedPosition,
  onPositionClick,
}: LineupDiamondProps) {
  const positions: FieldPosition[] = LINEUP_POSITIONS.map((pos) => {
    const starter = starters.find((s) => s.lineupPosition === pos);
    return {
      position: pos,
      playerName: starter
        ? `${starter.playerCard.nameFirst} ${starter.playerCard.nameLast}`
        : '',
    };
  });

  return (
    <div className="vintage-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="pennant-header text-base">Field</h3>
        <span className="font-stat text-xs text-muted">
          {starters.length}/9 positions filled
        </span>
      </div>
      <DiamondField
        positions={positions}
        isEditable
        onPositionClick={onPositionClick}
        selectedPosition={selectedPosition ?? undefined}
      />
      {starters.length < 9 && (
        <p className="mt-2 text-center font-body text-xs text-muted">
          Click a position to assign a bench player
        </p>
      )}
    </div>
  );
}

export default LineupDiamond;
