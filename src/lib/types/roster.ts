import type { PlayerCard } from './player';

export interface RosterEntry {
  readonly id: string;                // rosters table PK
  readonly playerId: string;          // Lahman playerID
  readonly playerCard: PlayerCard;    // Full card from JSONB
  rosterSlot: 'starter' | 'bench' | 'rotation' | 'bullpen' | 'closer';
  lineupOrder: number | null;        // 1-9 for starters, null otherwise
  lineupPosition: string | null;     // Defensive position for starters
}

export interface LineupUpdate {
  readonly rosterId: string;
  lineupOrder: number | null;
  lineupPosition: string | null;
  rosterSlot: string;
}
