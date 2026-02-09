/**
 * Mock Game Fixtures
 *
 * Factory functions for creating mock game results, play-by-play, and box scores.
 */

import type {
  GameResult,
  PlayByPlayEntry,
  BoxScore,
  BattingLine,
  PitchingLine,
  BaseState,
} from '@lib/types/game';
import { OutcomeCategory } from '@lib/types/game';

export function createMockBaseState(overrides?: Partial<BaseState>): BaseState {
  return {
    first: null,
    second: null,
    third: null,
    ...overrides,
  };
}

export function createMockPlayByPlay(overrides?: Partial<PlayByPlayEntry>): PlayByPlayEntry {
  return {
    inning: 1,
    halfInning: 'top',
    outs: 0,
    batterId: 'batter-1',
    pitcherId: 'pitcher-1',
    cardPosition: 7,
    cardValue: 8,
    outcomeTableRow: 15,
    outcome: OutcomeCategory.SINGLE_CLEAN,
    description: 'Batter singles to center field.',
    basesAfter: createMockBaseState({ first: 'batter-1' }),
    scoreAfter: { home: 0, away: 0 },
    ...overrides,
  };
}

export function createMockBattingLine(overrides?: Partial<BattingLine>): BattingLine {
  return {
    playerId: 'batter-1',
    AB: 4,
    R: 1,
    H: 2,
    doubles: 0,
    triples: 0,
    HR: 0,
    RBI: 1,
    BB: 0,
    SO: 1,
    SB: 0,
    CS: 0,
    HBP: 0,
    SF: 0,
    ...overrides,
  };
}

export function createMockPitchingLine(overrides?: Partial<PitchingLine>): PitchingLine {
  return {
    playerId: 'pitcher-1',
    IP: 7,
    H: 6,
    R: 2,
    ER: 2,
    BB: 2,
    SO: 5,
    HR: 1,
    BF: 28,
    decision: 'W',
    ...overrides,
  };
}

export function createMockBoxScore(overrides?: Partial<BoxScore>): BoxScore {
  return {
    lineScore: {
      away: [0, 1, 0, 0, 2, 0, 0, 0, 0],
      home: [1, 0, 0, 0, 0, 0, 3, 0, 0],
    },
    awayHits: 6,
    homeHits: 8,
    awayErrors: 1,
    homeErrors: 0,
    ...overrides,
  };
}

export function createMockGameResult(overrides?: Partial<GameResult>): GameResult {
  return {
    gameId: 'game-1',
    homeTeamId: 'team-1',
    awayTeamId: 'team-2',
    homeScore: 4,
    awayScore: 3,
    innings: 9,
    winningPitcherId: 'pitcher-1',
    losingPitcherId: 'pitcher-2',
    savePitcherId: null,
    boxScore: createMockBoxScore(),
    playerBattingLines: [
      createMockBattingLine({ playerId: 'batter-1' }),
      createMockBattingLine({ playerId: 'batter-2', AB: 3, R: 0, H: 1, RBI: 0, SO: 2 }),
    ],
    playerPitchingLines: [
      createMockPitchingLine({ playerId: 'pitcher-1', decision: 'W' }),
      createMockPitchingLine({ playerId: 'pitcher-2', decision: 'L', IP: 6, H: 8, R: 4, ER: 4 }),
    ],
    playByPlay: [
      createMockPlayByPlay({ inning: 1, halfInning: 'top', description: 'Leadoff single to left.' }),
      createMockPlayByPlay({ inning: 1, halfInning: 'bottom', description: 'Solo homer to right.', outcome: OutcomeCategory.HOME_RUN }),
    ],
    ...overrides,
  };
}
