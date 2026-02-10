/**
 * AI Drafter Tests (TDD)
 *
 * REQ-DFT-006: CPU-controlled team drafting.
 * REQ-DFT-007: AI player valuation.
 * REQ-AI-008: Round-aware draft pick reasoning.
 *
 * Tests for the AI drafter that composes ai-strategy + template-reasoning
 * to make complete draft picks with reasoning for AI-controlled teams.
 */

import {
  makeAIPick,
  runFullAIDraft,
  type AITeamConfig,
  type AIDraftPickResult,
} from '@lib/draft/ai-drafter';
import {
  initializeDraft,
  getCurrentPickingTeam,
  getAvailablePool,
  isDraftComplete,
  type DraftEngineConfig,
} from '@lib/draft/draft-engine';
import type { DraftablePlayer } from '@lib/draft/ai-strategy';
import type { PlayerCard } from '@lib/types/player';
import { SeededRNG } from '@lib/rng/seeded-rng';

// ---------------------------------------------------------------------------
// Helpers (same pattern as draft-engine.test.ts)
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

function buildLargePool(): DraftablePlayer[] {
  const pool: DraftablePlayer[] = [];
  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] as const;
  let id = 0;

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

  return pool;
}

const AI_TEAMS: Map<string, AITeamConfig> = new Map([
  ['team-1', { teamId: 'team-1', teamName: 'Tigers', managerName: 'Sparky', managerStyle: 'conservative' as const }],
  ['team-2', { teamId: 'team-2', teamName: 'Athletics', managerName: 'Billy', managerStyle: 'analytical' as const }],
  ['team-3', { teamId: 'team-3', teamName: 'Dodgers', managerName: 'Tommy', managerStyle: 'aggressive' as const }],
  ['team-4', { teamId: 'team-4', teamName: 'Cardinals', managerName: 'Tony', managerStyle: 'balanced' as const }],
]);

// ---------------------------------------------------------------------------
// makeAIPick
// ---------------------------------------------------------------------------
describe('makeAIPick', () => {
  it('returns a valid player from the available pool', () => {
    const pool = buildLargePool();
    const state = initializeDraft(
      { teamIds: ['team-1', 'team-2'], playerPool: pool },
      new SeededRNG(42),
    );
    const team = getCurrentPickingTeam(state);
    const config = AI_TEAMS.get(team) ?? AI_TEAMS.get('team-1')!;
    const result = makeAIPick(state, config, new SeededRNG(42));
    expect(result.pick).toBeDefined();
    expect(result.pick.player.card.playerId).toBeDefined();
    // Player should be from the pool
    expect(pool.some(p => p.card.playerId === result.pick.player.card.playerId)).toBe(true);
  });

  it('generates reasoning text', () => {
    const pool = buildLargePool();
    const state = initializeDraft(
      { teamIds: ['team-1', 'team-2'], playerPool: pool },
      new SeededRNG(42),
    );
    const team = getCurrentPickingTeam(state);
    const config = AI_TEAMS.get(team) ?? AI_TEAMS.get('team-1')!;
    const result = makeAIPick(state, config, new SeededRNG(42));
    expect(result.reasoning).toBeDefined();
    expect(result.reasoning.reasoning.length).toBeGreaterThan(10);
    expect(result.reasoning.source).toBe('template');
  });

  it('submits the pick to the engine state', () => {
    const pool = buildLargePool();
    const state = initializeDraft(
      { teamIds: ['team-1', 'team-2'], playerPool: pool },
      new SeededRNG(42),
    );
    const picksBefore = state.picks.length;
    const team = getCurrentPickingTeam(state);
    const config = AI_TEAMS.get(team) ?? AI_TEAMS.get('team-1')!;
    makeAIPick(state, config, new SeededRNG(42));
    expect(state.picks.length).toBe(picksBefore + 1);
  });

  it('reasoning includes team name', () => {
    const pool = buildLargePool();
    const state = initializeDraft(
      { teamIds: ['team-1', 'team-2'], playerPool: pool },
      new SeededRNG(42),
    );
    const team = getCurrentPickingTeam(state);
    const config = AI_TEAMS.get(team) ?? AI_TEAMS.get('team-1')!;
    const result = makeAIPick(state, config, new SeededRNG(42));
    expect(result.reasoning.reasoning).toContain(config.teamName);
  });

  it('reasoning includes player name', () => {
    const pool = buildLargePool();
    const state = initializeDraft(
      { teamIds: ['team-1', 'team-2'], playerPool: pool },
      new SeededRNG(42),
    );
    const team = getCurrentPickingTeam(state);
    const config = AI_TEAMS.get(team) ?? AI_TEAMS.get('team-1')!;
    const result = makeAIPick(state, config, new SeededRNG(42));
    const pickedName = `${result.pick.player.card.nameFirst} ${result.pick.player.card.nameLast}`;
    expect(result.reasoning.reasoning).toContain(pickedName);
  });
});

// ---------------------------------------------------------------------------
// runFullAIDraft
// ---------------------------------------------------------------------------
describe('runFullAIDraft', () => {
  it('completes a full draft with all AI teams', () => {
    const pool = buildLargePool();
    const teamIds = Array.from(AI_TEAMS.keys());
    const state = initializeDraft({ teamIds, playerPool: pool }, new SeededRNG(42));
    const results = runFullAIDraft(state, AI_TEAMS, new SeededRNG(42));

    expect(isDraftComplete(state)).toBe(true);
    expect(results.length).toBe(teamIds.length * 21); // 4 teams x 21 rounds
  });

  it('each pick has reasoning', () => {
    const pool = buildLargePool();
    const teamIds = Array.from(AI_TEAMS.keys());
    const state = initializeDraft({ teamIds, playerPool: pool }, new SeededRNG(42));
    const results = runFullAIDraft(state, AI_TEAMS, new SeededRNG(42));

    for (const result of results) {
      expect(result.reasoning.reasoning.length).toBeGreaterThan(0);
    }
  });

  it('each team ends up with 21 players', () => {
    const pool = buildLargePool();
    const teamIds = Array.from(AI_TEAMS.keys());
    const state = initializeDraft({ teamIds, playerPool: pool }, new SeededRNG(42));
    runFullAIDraft(state, AI_TEAMS, new SeededRNG(42));

    for (const teamId of teamIds) {
      expect(state.teamRosters.get(teamId)!).toHaveLength(21);
    }
  });

  it('no player is picked twice', () => {
    const pool = buildLargePool();
    const teamIds = Array.from(AI_TEAMS.keys());
    const state = initializeDraft({ teamIds, playerPool: pool }, new SeededRNG(42));
    const results = runFullAIDraft(state, AI_TEAMS, new SeededRNG(42));

    const pickedIds = results.map(r => r.pick.player.card.playerId);
    expect(new Set(pickedIds).size).toBe(pickedIds.length);
  });

  it('is deterministic with same seed', () => {
    const pool = buildLargePool();
    const teamIds = Array.from(AI_TEAMS.keys());

    function runDraft(seed: number): string[] {
      const state = initializeDraft({ teamIds, playerPool: pool }, new SeededRNG(seed));
      const results = runFullAIDraft(state, AI_TEAMS, new SeededRNG(seed));
      return results.map(r => r.pick.player.card.playerId);
    }

    expect(runDraft(42)).toEqual(runDraft(42));
  });

  it('produces different team rosters with different seeds', () => {
    const pool = buildLargePool();
    const teamIds = Array.from(AI_TEAMS.keys());

    function runDraft(seed: number): Map<string, string[]> {
      const state = initializeDraft({ teamIds, playerPool: pool }, new SeededRNG(seed));
      runFullAIDraft(state, AI_TEAMS, new SeededRNG(seed));
      const rosters = new Map<string, string[]>();
      for (const id of teamIds) {
        rosters.set(id, state.teamRosters.get(id)!.map(p => p.card.playerId));
      }
      return rosters;
    }

    const result1 = runDraft(1);
    const result2 = runDraft(999);
    // Different seeds produce different draft orders and RNG, giving different rosters
    let anyDiff = false;
    for (const teamId of teamIds) {
      if (JSON.stringify(result1.get(teamId)) !== JSON.stringify(result2.get(teamId))) {
        anyDiff = true;
        break;
      }
    }
    expect(anyDiff).toBe(true);
  });

  it('works with mixed AI/human teams (only AI teams autopick)', () => {
    const pool = buildLargePool();
    // Only 2 of 4 teams are AI-controlled
    const partialAI = new Map([
      ['team-1', AI_TEAMS.get('team-1')!],
      ['team-3', AI_TEAMS.get('team-3')!],
    ]);
    const state = initializeDraft(
      { teamIds: ['team-1', 'team-2', 'team-3', 'team-4'], playerPool: pool, totalRounds: 2 },
      new SeededRNG(42),
    );

    // runFullAIDraft should only pick for AI teams, skipping human teams
    const results = runFullAIDraft(state, partialAI, new SeededRNG(42));

    // Should have made picks only for AI teams
    for (const result of results) {
      expect(partialAI.has(result.pick.teamId)).toBe(true);
    }
  });
});
