/**
 * Mock Roster Fixtures
 *
 * Factory functions for creating mock roster entries.
 */

/** REQ-TEST-009: Fixture metadata */
export const _meta = {
  description: 'Roster entry and full 10-player roster mock factories with PlayerCard data',
  usedBy: [
    'tests/unit/stores/rosterStore.test.ts',
    'tests/unit/features/roster/RosterPage.test.tsx',
    'tests/unit/api/leagues/[id]/teams.test.ts',
  ],
  requirements: ['REQ-RST-001', 'REQ-RST-002', 'REQ-RST-003'],
};

import type { RosterEntry } from '@lib/types/roster';
import type { PlayerCard } from '@lib/types/player';

function createMockPlayerCard(overrides?: Partial<PlayerCard>): PlayerCard {
  return {
    playerId: 'player-1',
    nameFirst: 'Mock',
    nameLast: 'Player',
    seasonYear: 1993,
    battingHand: 'R',
    throwingHand: 'R',
    primaryPosition: 'CF',
    eligiblePositions: ['CF'],
    isPitcher: false,
    card: [7, 8, 9, 7, 13, 8, 7, 9, 8, 14, 7, 8, 9, 13, 14, 7, 8, 9, 8, 7, 9, 7, 8, 19, 8, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    powerRating: 19,
    archetype: { byte33: 7, byte34: 0 },
    speed: 0.6,
    power: 0.5,
    discipline: 0.5,
    contactRate: 0.7,
    fieldingPct: 0.98,
    range: 0.7,
    arm: 0.6,
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
    createMockRosterEntry({ id: 'r-1', playerId: 'p-1', lineupOrder: 1, lineupPosition: 'CF', playerCard: createMockPlayerCard({ playerId: 'p-1', nameFirst: 'Ken', nameLast: 'Griffey', primaryPosition: 'CF' }) }),
    createMockRosterEntry({ id: 'r-2', playerId: 'p-2', lineupOrder: 2, lineupPosition: 'SS', playerCard: createMockPlayerCard({ playerId: 'p-2', nameFirst: 'Cal', nameLast: 'Ripken', primaryPosition: 'SS' }) }),
    createMockRosterEntry({ id: 'r-3', playerId: 'p-3', lineupOrder: 3, lineupPosition: '1B', playerCard: createMockPlayerCard({ playerId: 'p-3', nameFirst: 'Frank', nameLast: 'Thomas', primaryPosition: '1B' }) }),
    createMockRosterEntry({ id: 'r-4', playerId: 'p-4', lineupOrder: 4, lineupPosition: 'LF', playerCard: createMockPlayerCard({ playerId: 'p-4', nameFirst: 'Barry', nameLast: 'Bonds', primaryPosition: 'LF' }) }),
    createMockRosterEntry({ id: 'r-5', playerId: 'p-5', lineupOrder: 5, lineupPosition: '3B', playerCard: createMockPlayerCard({ playerId: 'p-5', nameFirst: 'Chipper', nameLast: 'Jones', primaryPosition: '3B' }) }),
    createMockRosterEntry({ id: 'r-6', playerId: 'p-6', lineupOrder: 6, lineupPosition: 'RF', playerCard: createMockPlayerCard({ playerId: 'p-6', nameFirst: 'Larry', nameLast: 'Walker', primaryPosition: 'RF' }) }),
    createMockRosterEntry({ id: 'r-7', playerId: 'p-7', lineupOrder: 7, lineupPosition: '2B', playerCard: createMockPlayerCard({ playerId: 'p-7', nameFirst: 'Roberto', nameLast: 'Alomar', primaryPosition: '2B' }) }),
    createMockRosterEntry({ id: 'r-8', playerId: 'p-8', lineupOrder: 8, lineupPosition: 'C', playerCard: createMockPlayerCard({ playerId: 'p-8', nameFirst: 'Mike', nameLast: 'Piazza', primaryPosition: 'C' }) }),
    createMockRosterEntry({ id: 'r-9', playerId: 'p-9', lineupOrder: 9, lineupPosition: 'P', rosterSlot: 'rotation', playerCard: createMockPlayerCard({ playerId: 'p-9', nameFirst: 'Greg', nameLast: 'Maddux', primaryPosition: 'P', isPitcher: true, eligiblePositions: ['P'], pitching: { role: 'SP', grade: 3, stamina: 7, era: 2.36, whip: 1.05, k9: 7.5, bb9: 1.8, hr9: 0.7, usageFlags: [], isReliever: false } }) }),
    createMockRosterEntry({ id: 'r-10', playerId: 'p-10', lineupOrder: null, lineupPosition: null, rosterSlot: 'bench', playerCard: createMockPlayerCard({ playerId: 'p-10', nameFirst: 'Tony', nameLast: 'Gwynn', primaryPosition: 'RF' }) }),
  ];
}
