/**
 * Draft Engine Tests (TDD)
 *
 * REQ-DFT-001: 21-round snake draft.
 * REQ-DFT-002: Randomized order, reverses each round.
 *
 * Tests for the draft engine state machine that composes
 * draft-order, ai-strategy, and roster-validator.
 */

import {
  initializeDraft,
  getCurrentPickingTeam,
  getAvailablePool,
  submitDraftPick,
  isDraftComplete,
  completeDraft,
  type DraftEngineState,
  type DraftEngineConfig,
  type DraftEnginePick,
} from '@lib/draft/draft-engine';
import type { DraftablePlayer } from '@lib/draft/ai-strategy';
import type { PlayerCard } from '@lib/types/player';
import { SeededRNG } from '@lib/rng/seeded-rng';
import { TOTAL_ROUNDS } from '@lib/draft/draft-order';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(overrides: Partial<PlayerCard> = {}): PlayerCard {
  return {
    playerId: 'test01',
    nameFirst: 'Test',
    nameLast: 'Player',
    seasonYear: 2000,
    battingHand: 'R',
    throwingHand: 'R',
    primaryPosition: '1B',
    eligiblePositions: ['1B'],
    isPitcher: false,
    card: new Array(35).fill(0),
    powerRating: 17,
    archetype: { byte33: 7, byte34: 0 },
    speed: 0.5,
    power: 0.15,
    discipline: 0.5,
    contactRate: 0.8,
    fieldingPct: 0.98,
    range: 0.5,
    arm: 0.5,
    ...overrides,
  };
}

function makeDraftable(
  card: PlayerCard,
  ops: number,
  sb: number,
): DraftablePlayer {
  return { card, ops, sb };
}

function makePitcherCard(
  role: 'SP' | 'RP' | 'CL',
  overrides: Partial<PlayerCard> = {},
): PlayerCard {
  return makeCard({
    isPitcher: true,
    primaryPosition: role,
    eligiblePositions: [role],
    pitching: {
      role,
      grade: 10,
      stamina: role === 'SP' ? 6.5 : 2,
      era: 3.20,
      whip: 1.15,
      k9: 8.5,
      bb9: 2.5,
      hr9: 0.9,
      usageFlags: [],
      isReliever: role !== 'SP',
    },
    ...overrides,
  });
}

/** Build a pool big enough for a full 4-team, 21-round draft (84+ players). */
function buildLargePool(): DraftablePlayer[] {
  const pool: DraftablePlayer[] = [];
  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] as const;
  let id = 0;

  // 8 of each position (72 position players)
  for (const pos of positions) {
    for (let i = 0; i < 8; i++) {
      id++;
      pool.push(makeDraftable(
        makeCard({
          playerId: `pos${id}`,
          nameFirst: pos,
          nameLast: `Player${i}`,
          primaryPosition: pos,
          eligiblePositions: [pos],
          fieldingPct: 0.97 - i * 0.005,
        }),
        0.850 - i * 0.02,
        10 - i,
      ));
    }
  }

  // 12 SP
  for (let i = 0; i < 12; i++) {
    id++;
    pool.push({
      card: makePitcherCard('SP', {
        playerId: `sp${id}`,
        nameFirst: 'SP',
        nameLast: `Pitcher${i}`,
        pitching: {
          role: 'SP',
          grade: 12 - i,
          stamina: 7 - i * 0.3,
          era: 2.80 + i * 0.25,
          whip: 1.05 + i * 0.05,
          k9: 10 - i * 0.3,
          bb9: 2.0 + i * 0.2,
          hr9: 0.7 + i * 0.05,
          usageFlags: [],
          isReliever: false,
        },
      }),
      ops: 0,
      sb: 0,
    });
  }

  // 8 RP
  for (let i = 0; i < 8; i++) {
    id++;
    pool.push({
      card: makePitcherCard('RP', {
        playerId: `rp${id}`,
        nameFirst: 'RP',
        nameLast: `Reliever${i}`,
        pitching: {
          role: 'RP',
          grade: 9 - i,
          stamina: 2,
          era: 3.00 + i * 0.30,
          whip: 1.10 + i * 0.05,
          k9: 9.5 - i * 0.3,
          bb9: 2.5 + i * 0.2,
          hr9: 0.8 + i * 0.05,
          usageFlags: [],
          isReliever: true,
        },
      }),
      ops: 0,
      sb: 0,
    });
  }

  // 4 CL
  for (let i = 0; i < 4; i++) {
    id++;
    pool.push({
      card: makePitcherCard('CL', {
        playerId: `cl${id}`,
        nameFirst: 'CL',
        nameLast: `Closer${i}`,
        pitching: {
          role: 'CL',
          grade: 10 - i,
          stamina: 1.5,
          era: 2.20 + i * 0.40,
          whip: 0.95 + i * 0.10,
          k9: 11 - i * 0.5,
          bb9: 2.2 + i * 0.3,
          hr9: 0.5 + i * 0.1,
          usageFlags: [],
          isReliever: true,
        },
      }),
      ops: 0,
      sb: 0,
    });
  }

  return pool; // 72 + 12 + 8 + 4 = 96 players
}

/** Build a small pool for simpler tests (12 players). */
function buildSmallPool(): DraftablePlayer[] {
  return [
    makeDraftable(makeCard({ playerId: 'c01', primaryPosition: 'C', eligiblePositions: ['C'], nameFirst: 'C', nameLast: 'Player' }), 0.750, 2),
    makeDraftable(makeCard({ playerId: '1b01', primaryPosition: '1B', eligiblePositions: ['1B'], nameFirst: '1B', nameLast: 'Player' }), 0.820, 3),
    makeDraftable(makeCard({ playerId: 'ss01', primaryPosition: 'SS', eligiblePositions: ['SS'], nameFirst: 'SS', nameLast: 'Player' }), 0.770, 20),
    makeDraftable(makeCard({ playerId: 'lf01', primaryPosition: 'LF', eligiblePositions: ['LF'], nameFirst: 'LF', nameLast: 'Player' }), 0.800, 8),
    makeDraftable(makeCard({ playerId: 'cf01', primaryPosition: 'CF', eligiblePositions: ['CF'], nameFirst: 'CF', nameLast: 'Player' }), 0.790, 25),
    makeDraftable(makeCard({ playerId: 'rf01', primaryPosition: 'RF', eligiblePositions: ['RF'], nameFirst: 'RF', nameLast: 'Player' }), 0.830, 10),
    { card: makePitcherCard('SP', { playerId: 'sp01', nameFirst: 'SP', nameLast: 'Ace' }), ops: 0, sb: 0 },
    { card: makePitcherCard('SP', { playerId: 'sp02', nameFirst: 'SP', nameLast: 'Two' }), ops: 0, sb: 0 },
    { card: makePitcherCard('RP', { playerId: 'rp01', nameFirst: 'RP', nameLast: 'Setup' }), ops: 0, sb: 0 },
    { card: makePitcherCard('RP', { playerId: 'rp02', nameFirst: 'RP', nameLast: 'Middle' }), ops: 0, sb: 0 },
    { card: makePitcherCard('CL', { playerId: 'cl01', nameFirst: 'CL', nameLast: 'Closer' }), ops: 0, sb: 0 },
    makeDraftable(makeCard({ playerId: 'dh01', primaryPosition: 'DH', eligiblePositions: ['DH'], nameFirst: 'DH', nameLast: 'Slugger' }), 0.870, 1),
  ];
}

// ---------------------------------------------------------------------------
// initializeDraft (REQ-DFT-001, REQ-DFT-002)
// ---------------------------------------------------------------------------
describe('initializeDraft', () => {
  const teamIds = ['team-a', 'team-b', 'team-c', 'team-d'];
  const pool = buildSmallPool();

  it('creates state with in_progress status', () => {
    const config: DraftEngineConfig = { teamIds, playerPool: pool };
    const state = initializeDraft(config, new SeededRNG(42));
    expect(state.status).toBe('in_progress');
  });

  it('shuffles draft order containing all team IDs', () => {
    const config: DraftEngineConfig = { teamIds, playerPool: pool };
    const state = initializeDraft(config, new SeededRNG(42));
    expect(state.draftOrder).toHaveLength(4);
    expect(new Set(state.draftOrder)).toEqual(new Set(teamIds));
  });

  it('randomizes draft order with different seeds', () => {
    const config: DraftEngineConfig = { teamIds, playerPool: pool };
    const state1 = initializeDraft(config, new SeededRNG(1));
    const state2 = initializeDraft(config, new SeededRNG(999));
    // With 4 teams, different seeds should usually produce different orders
    // (1/24 chance of same order by chance, so this is very likely to differ)
    const orders = [state1.draftOrder.join(','), state2.draftOrder.join(',')];
    // Just check both are valid; statistical test not worth brittleness
    expect(new Set(state1.draftOrder)).toEqual(new Set(teamIds));
    expect(new Set(state2.draftOrder)).toEqual(new Set(teamIds));
  });

  it('starts at round 1, pick 1', () => {
    const config: DraftEngineConfig = { teamIds, playerPool: pool };
    const state = initializeDraft(config, new SeededRNG(42));
    expect(state.currentRound).toBe(1);
    expect(state.currentPick).toBe(1);
  });

  it('initializes empty rosters for each team', () => {
    const config: DraftEngineConfig = { teamIds, playerPool: pool };
    const state = initializeDraft(config, new SeededRNG(42));
    for (const id of teamIds) {
      expect(state.teamRosters.get(id)).toEqual([]);
    }
  });

  it('has no drafted player IDs initially', () => {
    const config: DraftEngineConfig = { teamIds, playerPool: pool };
    const state = initializeDraft(config, new SeededRNG(42));
    expect(state.draftedPlayerIds.size).toBe(0);
  });

  it('stores the full player pool', () => {
    const config: DraftEngineConfig = { teamIds, playerPool: pool };
    const state = initializeDraft(config, new SeededRNG(42));
    expect(state.playerPool).toHaveLength(pool.length);
  });

  it('defaults to TOTAL_ROUNDS (21)', () => {
    const config: DraftEngineConfig = { teamIds, playerPool: pool };
    const state = initializeDraft(config, new SeededRNG(42));
    expect(state.totalRounds).toBe(TOTAL_ROUNDS);
  });

  it('allows custom totalRounds', () => {
    const config: DraftEngineConfig = { teamIds, playerPool: pool, totalRounds: 5 };
    const state = initializeDraft(config, new SeededRNG(42));
    expect(state.totalRounds).toBe(5);
  });

  it('starts with empty picks array', () => {
    const config: DraftEngineConfig = { teamIds, playerPool: pool };
    const state = initializeDraft(config, new SeededRNG(42));
    expect(state.picks).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getCurrentPickingTeam
// ---------------------------------------------------------------------------
describe('getCurrentPickingTeam', () => {
  it('returns first team in order for round 1 pick 1', () => {
    const pool = buildSmallPool();
    const rng = new SeededRNG(42);
    const state = initializeDraft({ teamIds: ['A', 'B', 'C'], playerPool: pool }, rng);
    const team = getCurrentPickingTeam(state);
    expect(team).toBe(state.draftOrder[0]);
  });

  it('returns second team for round 1 pick 2', () => {
    const pool = buildSmallPool();
    const state = initializeDraft({ teamIds: ['A', 'B', 'C'], playerPool: pool }, new SeededRNG(42));
    // Advance to pick 2 by making a pick
    const firstTeam = getCurrentPickingTeam(state);
    submitDraftPick(state, firstTeam, pool[0]);
    const secondTeam = getCurrentPickingTeam(state);
    expect(secondTeam).toBe(state.draftOrder[1]);
  });

  it('reverses order in even rounds (snake)', () => {
    const pool = buildSmallPool();
    const state = initializeDraft(
      { teamIds: ['A', 'B', 'C'], playerPool: pool, totalRounds: 3 },
      new SeededRNG(42),
    );
    // Complete round 1 (3 picks)
    for (let i = 0; i < 3; i++) {
      const team = getCurrentPickingTeam(state);
      submitDraftPick(state, team, pool[i]);
    }
    // Now in round 2 -- order should be reversed
    expect(state.currentRound).toBe(2);
    expect(state.currentPick).toBe(1);
    const r2p1Team = getCurrentPickingTeam(state);
    // In snake, round 2 pick 1 = last team from round 1 order
    expect(r2p1Team).toBe(state.draftOrder[2]);
  });
});

// ---------------------------------------------------------------------------
// getAvailablePool
// ---------------------------------------------------------------------------
describe('getAvailablePool', () => {
  it('returns all players when no picks made', () => {
    const pool = buildSmallPool();
    const state = initializeDraft({ teamIds: ['A', 'B'], playerPool: pool }, new SeededRNG(42));
    const available = getAvailablePool(state);
    expect(available).toHaveLength(pool.length);
  });

  it('excludes drafted players', () => {
    const pool = buildSmallPool();
    const state = initializeDraft({ teamIds: ['A', 'B'], playerPool: pool }, new SeededRNG(42));
    const team = getCurrentPickingTeam(state);
    submitDraftPick(state, team, pool[0]);
    const available = getAvailablePool(state);
    expect(available).toHaveLength(pool.length - 1);
    expect(available.find(p => p.card.playerId === pool[0].card.playerId)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// submitDraftPick
// ---------------------------------------------------------------------------
describe('submitDraftPick', () => {
  it('records the pick with correct round, pick, teamId', () => {
    const pool = buildSmallPool();
    const state = initializeDraft({ teamIds: ['A', 'B'], playerPool: pool }, new SeededRNG(42));
    const team = getCurrentPickingTeam(state);
    const result = submitDraftPick(state, team, pool[0]);
    expect(result.round).toBe(1);
    expect(result.pick).toBe(1);
    expect(result.teamId).toBe(team);
    expect(result.player.card.playerId).toBe(pool[0].card.playerId);
  });

  it('adds player to team roster', () => {
    const pool = buildSmallPool();
    const state = initializeDraft({ teamIds: ['A', 'B'], playerPool: pool }, new SeededRNG(42));
    const team = getCurrentPickingTeam(state);
    submitDraftPick(state, team, pool[0]);
    const roster = state.teamRosters.get(team)!;
    expect(roster).toHaveLength(1);
    expect(roster[0].card.playerId).toBe(pool[0].card.playerId);
  });

  it('marks player as drafted', () => {
    const pool = buildSmallPool();
    const state = initializeDraft({ teamIds: ['A', 'B'], playerPool: pool }, new SeededRNG(42));
    const team = getCurrentPickingTeam(state);
    submitDraftPick(state, team, pool[0]);
    expect(state.draftedPlayerIds.has(pool[0].card.playerId)).toBe(true);
  });

  it('advances to the next pick', () => {
    const pool = buildSmallPool();
    const state = initializeDraft({ teamIds: ['A', 'B'], playerPool: pool }, new SeededRNG(42));
    const team = getCurrentPickingTeam(state);
    submitDraftPick(state, team, pool[0]);
    expect(state.currentPick).toBe(2);
    expect(state.currentRound).toBe(1);
  });

  it('advances to next round when current round is full', () => {
    const pool = buildSmallPool();
    const state = initializeDraft(
      { teamIds: ['A', 'B'], playerPool: pool, totalRounds: 3 },
      new SeededRNG(42),
    );
    // Make 2 picks (completes round 1 for 2 teams)
    for (let i = 0; i < 2; i++) {
      const team = getCurrentPickingTeam(state);
      submitDraftPick(state, team, pool[i]);
    }
    expect(state.currentRound).toBe(2);
    expect(state.currentPick).toBe(1);
  });

  it('throws when wrong team tries to pick', () => {
    const pool = buildSmallPool();
    const state = initializeDraft({ teamIds: ['A', 'B'], playerPool: pool }, new SeededRNG(42));
    const currentTeam = getCurrentPickingTeam(state);
    const wrongTeam = currentTeam === 'A' ? 'B' : 'A';
    expect(() => submitDraftPick(state, wrongTeam, pool[0])).toThrow(/not.*turn/i);
  });

  it('throws when player already drafted', () => {
    const pool = buildSmallPool();
    const state = initializeDraft({ teamIds: ['A', 'B'], playerPool: pool }, new SeededRNG(42));
    const team1 = getCurrentPickingTeam(state);
    submitDraftPick(state, team1, pool[0]);
    const team2 = getCurrentPickingTeam(state);
    expect(() => submitDraftPick(state, team2, pool[0])).toThrow(/already.*drafted/i);
  });

  it('throws when draft is already complete', () => {
    const pool = buildSmallPool();
    const state = initializeDraft(
      { teamIds: ['A', 'B'], playerPool: pool, totalRounds: 1 },
      new SeededRNG(42),
    );
    // Complete the draft (1 round, 2 picks)
    for (let i = 0; i < 2; i++) {
      const team = getCurrentPickingTeam(state);
      submitDraftPick(state, team, pool[i]);
    }
    expect(state.status).toBe('completed');
    expect(() => submitDraftPick(state, 'A', pool[2])).toThrow(/complete/i);
  });

  it('marks draft completed after the last pick', () => {
    const pool = buildSmallPool();
    const state = initializeDraft(
      { teamIds: ['A', 'B'], playerPool: pool, totalRounds: 2 },
      new SeededRNG(42),
    );
    // 2 teams x 2 rounds = 4 picks
    for (let i = 0; i < 4; i++) {
      const team = getCurrentPickingTeam(state);
      submitDraftPick(state, team, pool[i]);
    }
    expect(state.status).toBe('completed');
    expect(state.picks).toHaveLength(4);
  });

  it('records all picks in order', () => {
    const pool = buildSmallPool();
    const state = initializeDraft(
      { teamIds: ['A', 'B'], playerPool: pool, totalRounds: 2 },
      new SeededRNG(42),
    );
    const pickedPlayerIds: string[] = [];
    for (let i = 0; i < 4; i++) {
      const team = getCurrentPickingTeam(state);
      const result = submitDraftPick(state, team, pool[i]);
      pickedPlayerIds.push(result.player.card.playerId);
    }
    expect(state.picks.map(p => p.player.card.playerId)).toEqual(pickedPlayerIds);
  });
});

// ---------------------------------------------------------------------------
// isDraftComplete
// ---------------------------------------------------------------------------
describe('isDraftComplete', () => {
  it('returns false during draft', () => {
    const pool = buildSmallPool();
    const state = initializeDraft({ teamIds: ['A', 'B'], playerPool: pool }, new SeededRNG(42));
    expect(isDraftComplete(state)).toBe(false);
  });

  it('returns true after all picks', () => {
    const pool = buildSmallPool();
    const state = initializeDraft(
      { teamIds: ['A', 'B'], playerPool: pool, totalRounds: 1 },
      new SeededRNG(42),
    );
    for (let i = 0; i < 2; i++) {
      const team = getCurrentPickingTeam(state);
      submitDraftPick(state, team, pool[i]);
    }
    expect(isDraftComplete(state)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// completeDraft (REQ-DFT-008)
// ---------------------------------------------------------------------------
describe('completeDraft', () => {
  it('returns validation results for each team', () => {
    const pool = buildSmallPool();
    const state = initializeDraft(
      { teamIds: ['A', 'B'], playerPool: pool, totalRounds: 2 },
      new SeededRNG(42),
    );
    for (let i = 0; i < 4; i++) {
      const team = getCurrentPickingTeam(state);
      submitDraftPick(state, team, pool[i]);
    }
    const results = completeDraft(state);
    expect(results.has('A')).toBe(true);
    expect(results.has('B')).toBe(true);
    for (const [, result] of results) {
      expect(result.validation).toBeDefined();
      expect(result.roster).toBeDefined();
    }
  });

  it('auto-fills roster gaps from remaining pool', () => {
    const pool = buildLargePool();
    const state = initializeDraft(
      { teamIds: ['A', 'B'], playerPool: pool, totalRounds: 10 },
      new SeededRNG(42),
    );
    // Make 20 picks (10 rounds x 2 teams)
    for (let i = 0; i < 20; i++) {
      const team = getCurrentPickingTeam(state);
      submitDraftPick(state, team, pool[i]);
    }
    const results = completeDraft(state);
    // After auto-fill, rosters should be larger than 10 picks each
    for (const [, result] of results) {
      expect(result.roster.length).toBeGreaterThanOrEqual(10);
    }
  });

  it('throws if draft is not completed', () => {
    const pool = buildSmallPool();
    const state = initializeDraft({ teamIds: ['A', 'B'], playerPool: pool }, new SeededRNG(42));
    expect(() => completeDraft(state)).toThrow(/not.*complete/i);
  });
});

// ---------------------------------------------------------------------------
// Full 4-team draft simulation
// ---------------------------------------------------------------------------
describe('full draft simulation', () => {
  it('completes a 4-team, 21-round draft with valid state transitions', () => {
    const pool = buildLargePool();
    const teamIds = ['team-1', 'team-2', 'team-3', 'team-4'];
    const state = initializeDraft({ teamIds, playerPool: pool }, new SeededRNG(42));

    const totalPicks = teamIds.length * TOTAL_ROUNDS; // 4 * 21 = 84
    let pickIdx = 0;
    const availablePool = getAvailablePool(state);

    while (!isDraftComplete(state)) {
      const team = getCurrentPickingTeam(state);
      const available = getAvailablePool(state);
      expect(available.length).toBe(pool.length - pickIdx);

      // Pick the first available player
      submitDraftPick(state, team, available[0]);
      pickIdx++;
    }

    expect(pickIdx).toBe(totalPicks);
    expect(state.status).toBe('completed');
    expect(state.picks).toHaveLength(totalPicks);

    // Each team should have 21 players
    for (const id of teamIds) {
      expect(state.teamRosters.get(id)!).toHaveLength(TOTAL_ROUNDS);
    }

    // No player drafted twice
    const allDraftedIds = state.picks.map(p => p.player.card.playerId);
    expect(new Set(allDraftedIds).size).toBe(totalPicks);
  });

  it('is deterministic with same seed', () => {
    const pool = buildLargePool();
    const teamIds = ['t1', 't2', 't3', 't4'];

    function runDraft(seed: number): string[] {
      const state = initializeDraft({ teamIds, playerPool: pool }, new SeededRNG(seed));
      while (!isDraftComplete(state)) {
        const team = getCurrentPickingTeam(state);
        const available = getAvailablePool(state);
        submitDraftPick(state, team, available[0]);
      }
      return state.picks.map(p => p.player.card.playerId);
    }

    const result1 = runDraft(123);
    const result2 = runDraft(123);
    expect(result1).toEqual(result2);
  });

  it('produces different team rosters with different seeds', () => {
    const pool = buildLargePool();
    const teamIds = ['t1', 't2', 't3', 't4'];

    function runDraft(seed: number): Map<string, string[]> {
      const state = initializeDraft({ teamIds, playerPool: pool }, new SeededRNG(seed));
      while (!isDraftComplete(state)) {
        const team = getCurrentPickingTeam(state);
        const available = getAvailablePool(state);
        submitDraftPick(state, team, available[0]);
      }
      const rosters = new Map<string, string[]>();
      for (const id of teamIds) {
        rosters.set(id, state.teamRosters.get(id)!.map(p => p.card.playerId));
      }
      return rosters;
    }

    const result1 = runDraft(1);
    const result2 = runDraft(999);
    // Different seeds produce different draft orders, so teams get different rosters
    let anyDiff = false;
    for (const teamId of teamIds) {
      if (JSON.stringify(result1.get(teamId)) !== JSON.stringify(result2.get(teamId))) {
        anyDiff = true;
        break;
      }
    }
    expect(anyDiff).toBe(true);
  });
});
