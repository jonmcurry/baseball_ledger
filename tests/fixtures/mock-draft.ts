/**
 * Draft test fixtures
 */

import type { DraftState, DraftPickResult } from '../../src/lib/types/draft';
import type { AvailablePlayer } from '../../src/stores/draftStore';
import type { PlayerCard } from '../../src/lib/types/player';

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
