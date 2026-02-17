/**
 * Draft test fixtures
 */

/** REQ-TEST-009: Fixture metadata */
export const _meta = {
  description: 'Draft state, pick result, and available player mock factories',
  usedBy: [
    'tests/unit/stores/draftStore.test.ts',
    'tests/unit/features/draft/DraftBoardPage.test.tsx',
    'tests/unit/api/leagues/[id]/draft.test.ts',
  ],
  requirements: ['REQ-DFT-001', 'REQ-DFT-002', 'REQ-DFT-004'],
};

import type { DraftState, DraftPickResult } from '../../src/lib/types/draft';
import type { AvailablePlayer } from '../../src/stores/draftStore';
import type { PlayerCard } from '../../src/lib/types/player';
import { generateApbaCard } from '../../src/lib/card-generator/apba-card-generator';

export function createMockDraftState(overrides: Partial<DraftState> = {}): DraftState {
  return {
    leagueId: 'league-1',
    status: 'in_progress',
    currentRound: 1,
    currentPick: 3,
    currentTeamId: 'team-1',
    picks: [
      createMockDraftPick({ round: 1, pick: 1, teamId: 'team-2', playerId: 'player-a' }),
      createMockDraftPick({ round: 1, pick: 2, teamId: 'team-3', playerId: 'player-b' }),
    ],
    totalRounds: 21,
    pickTimerSeconds: 60,
    ...overrides,
  };
}

export function createMockDraftPick(overrides: Partial<DraftPickResult> = {}): DraftPickResult {
  return {
    round: 1,
    pick: 1,
    teamId: 'team-1',
    playerId: 'griffey01',
    playerName: 'Ken Griffey Jr.',
    position: 'CF',
    isComplete: false,
    nextTeamId: 'team-2',
    ...overrides,
  };
}

export function createMockAvailablePlayer(overrides: Partial<AvailablePlayer> = {}): AvailablePlayer {
  return {
    playerId: 'ruth01',
    nameFirst: 'Babe',
    nameLast: 'Ruth',
    seasonYear: 1927,
    primaryPosition: 'RF',
    playerCard: createMockPlayerCard(),
    ...overrides,
  };
}

function createMockPlayerCard(): PlayerCard {
  return {
    playerId: 'ruth01',
    nameFirst: 'Babe',
    nameLast: 'Ruth',
    seasonYear: 1927,
    battingHand: 'L',
    throwingHand: 'L',
    primaryPosition: 'RF',
    eligiblePositions: ['RF', 'LF'],
    isPitcher: false,
    apbaCard: generateApbaCard({
      PA: 600, walkRate: 0.15, strikeoutRate: 0.10, homeRunRate: 0.10,
      singleRate: 0.15, doubleRate: 0.05, tripleRate: 0.01, sbRate: 0.10,
      iso: 0.350, hbpRate: 0.005, sfRate: 0.01, shRate: 0, gdpRate: 0.02,
    }, { byte33: 1, byte34: 0 }),
    card: Array.from({ length: 35 }, () => 7),
    powerRating: 21,
    archetype: { byte33: 1, byte34: 0 },
    speed: 0.5,
    power: 0.35,
    discipline: 0.7,
    contactRate: 0.8,
    fieldingPct: 0.970,
    range: 0.5,
    arm: 0.6,
  };
}
