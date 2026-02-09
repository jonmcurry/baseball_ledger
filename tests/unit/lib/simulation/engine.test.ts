import {
  createInitialGameState,
  advanceHalfInning,
  isGameOver,
  getBattingTeam,
  getFieldingTeam,
  advanceBatterIndex,
  shouldSkipBottomHalf,
  type GameConfig,
} from '@lib/simulation/engine';
import type { GameState, TeamState } from '@lib/types/game';
import type { PlayerCard } from '@lib/types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
function makePlayerCard(id: string, position: string = 'CF'): PlayerCard {
  return {
    playerId: id,
    nameFirst: 'Test',
    nameLast: id,
    seasonYear: 2024,
    battingHand: 'R' as const,
    throwingHand: 'R' as const,
    primaryPosition: position as PlayerCard['primaryPosition'],
    eligiblePositions: [position as PlayerCard['primaryPosition']],
    isPitcher: position === 'SP' || position === 'RP' || position === 'CL',
    card: new Array(35).fill(7),
    powerRating: 17,
    archetype: { byte33: 7, byte34: 0 },
    speed: 0.5,
    power: 0.15,
    discipline: 0.5,
    contactRate: 0.8,
    fieldingPct: 0.975,
    range: 0.5,
    arm: 0.5,
    pitching: position === 'SP' ? {
      role: 'SP' as const,
      grade: 12,
      stamina: 7,
      era: 3.50,
      whip: 1.20,
      k9: 8.0,
      bb9: 3.0,
      hr9: 1.0,
      usageFlags: [],
      isReliever: false,
    } : undefined,
  };
}

function makeLineup(): { playerId: string; playerName: string; rosterId: string; position: PlayerCard['primaryPosition'] }[] {
  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] as const;
  return positions.map((pos, i) => ({
    playerId: `player${i + 1}`,
    playerName: `Player ${i + 1}`,
    rosterId: `roster${i + 1}`,
    position: pos,
  }));
}

function makeTeamState(teamId: string): TeamState {
  const starter = makePlayerCard(`${teamId}_sp1`, 'SP');
  return {
    teamId,
    lineup: makeLineup(),
    currentPitcher: starter,
    bullpen: [
      makePlayerCard(`${teamId}_rp1`, 'RP'),
      makePlayerCard(`${teamId}_rp2`, 'RP'),
    ],
    closer: makePlayerCard(`${teamId}_cl`, 'CL'),
    benchPlayers: [],
    pitcherStats: { IP: 0, H: 0, R: 0, ER: 0, BB: 0, SO: 0, HR: 0, BF: 0, pitchCount: 0 },
    pitchersUsed: [starter],
  };
}

function makeGameConfig(): GameConfig {
  return {
    gameId: 'game-001',
    homeTeam: makeTeamState('home'),
    awayTeam: makeTeamState('away'),
    seed: 42,
  };
}

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  const config = makeGameConfig();
  const base = createInitialGameState(config);
  return { ...base, ...overrides };
}

// ---------------------------------------------------------------------------
// createInitialGameState
// ---------------------------------------------------------------------------
describe('createInitialGameState (REQ-SIM-002)', () => {
  it('initializes with inning 1, top half', () => {
    const state = createInitialGameState(makeGameConfig());
    expect(state.inning).toBe(1);
    expect(state.halfInning).toBe('top');
  });

  it('initializes with 0 outs', () => {
    const state = createInitialGameState(makeGameConfig());
    expect(state.outs).toBe(0);
  });

  it('initializes with empty bases', () => {
    const state = createInitialGameState(makeGameConfig());
    expect(state.bases).toEqual({ first: null, second: null, third: null });
  });

  it('initializes scores at 0-0', () => {
    const state = createInitialGameState(makeGameConfig());
    expect(state.homeScore).toBe(0);
    expect(state.awayScore).toBe(0);
  });

  it('initializes with isComplete = false', () => {
    const state = createInitialGameState(makeGameConfig());
    expect(state.isComplete).toBe(false);
  });

  it('initializes with empty playByPlay', () => {
    const state = createInitialGameState(makeGameConfig());
    expect(state.playByPlay).toEqual([]);
  });

  it('initializes batter index at 0', () => {
    const state = createInitialGameState(makeGameConfig());
    expect(state.currentBatterIndex).toBe(0);
  });

  it('copies team states from config', () => {
    const config = makeGameConfig();
    const state = createInitialGameState(config);
    expect(state.homeTeam.teamId).toBe('home');
    expect(state.awayTeam.teamId).toBe('away');
  });
});

// ---------------------------------------------------------------------------
// advanceHalfInning
// ---------------------------------------------------------------------------
describe('advanceHalfInning (REQ-SIM-001)', () => {
  it('advances from top to bottom of same inning', () => {
    const state = makeGameState({ inning: 1, halfInning: 'top' });
    const next = advanceHalfInning(state);
    expect(next.inning).toBe(1);
    expect(next.halfInning).toBe('bottom');
  });

  it('advances from bottom to top of next inning', () => {
    const state = makeGameState({ inning: 1, halfInning: 'bottom' });
    const next = advanceHalfInning(state);
    expect(next.inning).toBe(2);
    expect(next.halfInning).toBe('top');
  });

  it('resets outs to 0', () => {
    const state = makeGameState({ outs: 3 });
    const next = advanceHalfInning(state);
    expect(next.outs).toBe(0);
  });

  it('clears bases', () => {
    const state = makeGameState({
      bases: { first: 'p1', second: 'p2', third: 'p3' },
    });
    const next = advanceHalfInning(state);
    expect(next.bases).toEqual({ first: null, second: null, third: null });
  });

  it('resets consecutiveHitsWalks to 0', () => {
    const state = makeGameState({ consecutiveHitsWalks: 3 });
    const next = advanceHalfInning(state);
    expect(next.consecutiveHitsWalks).toBe(0);
  });

  it('preserves scores', () => {
    const state = makeGameState({ homeScore: 3, awayScore: 2 });
    const next = advanceHalfInning(state);
    expect(next.homeScore).toBe(3);
    expect(next.awayScore).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// isGameOver
// ---------------------------------------------------------------------------
describe('isGameOver (REQ-SIM-001, REQ-SIM-015)', () => {
  it('game not over before 9 innings complete', () => {
    const state = makeGameState({ inning: 8, halfInning: 'bottom', homeScore: 5, awayScore: 3 });
    expect(isGameOver(state)).toBe(false);
  });

  it('game over after bottom of 9th when home team leads', () => {
    const state = makeGameState({
      inning: 9, halfInning: 'bottom', outs: 3,
      homeScore: 5, awayScore: 3,
    });
    expect(isGameOver(state)).toBe(true);
  });

  it('game over after bottom of 9th when away team leads', () => {
    const state = makeGameState({
      inning: 9, halfInning: 'bottom', outs: 3,
      homeScore: 3, awayScore: 5,
    });
    expect(isGameOver(state)).toBe(true);
  });

  it('game not over after 9 innings if tied (extra innings)', () => {
    const state = makeGameState({
      inning: 9, halfInning: 'bottom', outs: 3,
      homeScore: 3, awayScore: 3,
    });
    expect(isGameOver(state)).toBe(false);
  });

  it('game over after extra inning with leader', () => {
    const state = makeGameState({
      inning: 12, halfInning: 'bottom', outs: 3,
      homeScore: 4, awayScore: 3,
    });
    expect(isGameOver(state)).toBe(true);
  });

  it('game over mid-bottom-of-9th when home team takes lead (walk-off)', () => {
    // Home team scores go-ahead run during bottom of 9th
    const state = makeGameState({
      inning: 9, halfInning: 'bottom', outs: 1,
      homeScore: 5, awayScore: 4,
    });
    expect(isGameOver(state)).toBe(true);
  });

  it('game not over after top of 9th even with leader', () => {
    const state = makeGameState({
      inning: 9, halfInning: 'top', outs: 3,
      homeScore: 3, awayScore: 5,
    });
    expect(isGameOver(state)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// shouldSkipBottomHalf
// ---------------------------------------------------------------------------
describe('shouldSkipBottomHalf (REQ-SIM-001)', () => {
  it('skips bottom of 9th when home team leads after top', () => {
    expect(shouldSkipBottomHalf(9, 5, 3)).toBe(true);
  });

  it('does not skip when game is tied', () => {
    expect(shouldSkipBottomHalf(9, 3, 3)).toBe(false);
  });

  it('does not skip when away team leads', () => {
    expect(shouldSkipBottomHalf(9, 3, 5)).toBe(false);
  });

  it('does not skip before 9th inning even if home leads', () => {
    expect(shouldSkipBottomHalf(5, 5, 3)).toBe(false);
  });

  it('skips in extra innings when home leads after top', () => {
    expect(shouldSkipBottomHalf(11, 5, 3)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getBattingTeam / getFieldingTeam
// ---------------------------------------------------------------------------
describe('getBattingTeam / getFieldingTeam (REQ-SIM-001)', () => {
  it('away team bats in top half', () => {
    const state = makeGameState({ halfInning: 'top' });
    expect(getBattingTeam(state).teamId).toBe('away');
    expect(getFieldingTeam(state).teamId).toBe('home');
  });

  it('home team bats in bottom half', () => {
    const state = makeGameState({ halfInning: 'bottom' });
    expect(getBattingTeam(state).teamId).toBe('home');
    expect(getFieldingTeam(state).teamId).toBe('away');
  });
});

// ---------------------------------------------------------------------------
// advanceBatterIndex
// ---------------------------------------------------------------------------
describe('advanceBatterIndex (REQ-SIM-002)', () => {
  it('advances from 0 to 1', () => {
    expect(advanceBatterIndex(0)).toBe(1);
  });

  it('wraps from 8 back to 0', () => {
    expect(advanceBatterIndex(8)).toBe(0);
  });

  it('cycles through full order', () => {
    let idx = 0;
    for (let i = 0; i < 9; i++) {
      idx = advanceBatterIndex(idx);
    }
    expect(idx).toBe(0); // Back to leadoff
  });
});
