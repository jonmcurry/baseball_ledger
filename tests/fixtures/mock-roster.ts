/**
 * Mock Roster Fixtures
 *
 * Factory functions for creating mock roster entries.
 */

import type { RosterEntry } from '@lib/types/roster';
import type { PlayerCard } from '@lib/types/player';

function createMockPlayerCard(overrides?: Partial<PlayerCard>): PlayerCard {
  return {
    playerId: 'player-1',
    firstName: 'Mock',
    lastName: 'Player',
    yearId: 1993,
    bats: 'R',
    throws: 'R',
    positions: ['CF'],
    primaryPosition: 'CF',
    cardValues: [7, 8, 9, 7, 13, 8, 7, 9, 8, 14, 7, 8, 9, 13, 14, 7, 8, 9, 8, 7, 9, 7, 8, 19, 8, 7],
    pitcherGrade: null,
    powerRating: 19,
    speedRating: 6,
    battingStats: {
      G: 150, AB: 580, R: 90, H: 175, doubles: 30, triples: 5, HR: 25,
      RBI: 85, SB: 20, CS: 5, BB: 60, SO: 100, IBB: 3, HBP: 5,
      SH: 2, SF: 4, GIDP: 10, BA: 0.302, OBP: 0.370, SLG: 0.510, OPS: 0.880,
    },
    pitchingStats: null,
    ...overrides,
  };
}

export function createMockRosterEntry(overrides?: Partial<RosterEntry>): RosterEntry {
  return {
    id: 'roster-1',
    playerId: 'player-1',
    playerCard: createMockPlayerCard(),
    rosterSlot: 'starter',
    lineupOrder: 1,
    lineupPosition: 'CF',
    ...overrides,
  };
}

export function createMockRoster(): RosterEntry[] {
  return [
    createMockRosterEntry({ id: 'r-1', playerId: 'p-1', lineupOrder: 1, lineupPosition: 'CF', playerCard: createMockPlayerCard({ playerId: 'p-1', firstName: 'Ken', lastName: 'Griffey', primaryPosition: 'CF' }) }),
    createMockRosterEntry({ id: 'r-2', playerId: 'p-2', lineupOrder: 2, lineupPosition: 'SS', playerCard: createMockPlayerCard({ playerId: 'p-2', firstName: 'Cal', lastName: 'Ripken', primaryPosition: 'SS' }) }),
    createMockRosterEntry({ id: 'r-3', playerId: 'p-3', lineupOrder: 3, lineupPosition: '1B', playerCard: createMockPlayerCard({ playerId: 'p-3', firstName: 'Frank', lastName: 'Thomas', primaryPosition: '1B' }) }),
    createMockRosterEntry({ id: 'r-4', playerId: 'p-4', lineupOrder: 4, lineupPosition: 'LF', playerCard: createMockPlayerCard({ playerId: 'p-4', firstName: 'Barry', lastName: 'Bonds', primaryPosition: 'LF' }) }),
    createMockRosterEntry({ id: 'r-5', playerId: 'p-5', lineupOrder: 5, lineupPosition: '3B', playerCard: createMockPlayerCard({ playerId: 'p-5', firstName: 'Chipper', lastName: 'Jones', primaryPosition: '3B' }) }),
    createMockRosterEntry({ id: 'r-6', playerId: 'p-6', lineupOrder: 6, lineupPosition: 'RF', playerCard: createMockPlayerCard({ playerId: 'p-6', firstName: 'Larry', lastName: 'Walker', primaryPosition: 'RF' }) }),
    createMockRosterEntry({ id: 'r-7', playerId: 'p-7', lineupOrder: 7, lineupPosition: '2B', playerCard: createMockPlayerCard({ playerId: 'p-7', firstName: 'Roberto', lastName: 'Alomar', primaryPosition: '2B' }) }),
    createMockRosterEntry({ id: 'r-8', playerId: 'p-8', lineupOrder: 8, lineupPosition: 'C', playerCard: createMockPlayerCard({ playerId: 'p-8', firstName: 'Mike', lastName: 'Piazza', primaryPosition: 'C' }) }),
    createMockRosterEntry({ id: 'r-9', playerId: 'p-9', lineupOrder: 9, lineupPosition: 'P', rosterSlot: 'rotation', playerCard: createMockPlayerCard({ playerId: 'p-9', firstName: 'Greg', lastName: 'Maddux', primaryPosition: 'P', pitcherGrade: 3, positions: ['P'] }) }),
    createMockRosterEntry({ id: 'r-10', playerId: 'p-10', lineupOrder: null, lineupPosition: null, rosterSlot: 'bench', playerCard: createMockPlayerCard({ playerId: 'p-10', firstName: 'Tony', lastName: 'Gwynn', primaryPosition: 'RF' }) }),
  ];
}
