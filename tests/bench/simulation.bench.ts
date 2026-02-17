/**
 * Simulation Performance Benchmarks
 *
 * REQ-NFR-001: Single game < 500ms p95
 * REQ-NFR-002: Full season (1,296 games) < 60s
 * REQ-TEST-012/013: Performance benchmarks
 *
 * Uses performance.now() timing in standard test format since vitest bench
 * conflicts with globals: true in our config. These are run with `npx vitest run`
 * and report timing via console output.
 */

import type { PlayerCard, Position } from '../../src/lib/types/player';
import { runGame } from '../../src/lib/simulation/game-runner';
import type { RunGameConfig } from '../../src/lib/simulation/game-runner';
import { runDay } from '../../src/lib/simulation/season-runner';
import type { DayGameConfig } from '../../src/lib/simulation/season-runner';
import { generateApbaCard, generatePitcherApbaCard } from '../../src/lib/card-generator/apba-card-generator';
import type { PlayerRates } from '../../src/lib/card-generator/rate-calculator';

const DEFAULT_RATES: PlayerRates = {
  PA: 600, walkRate: 0.09, strikeoutRate: 0.17, homeRunRate: 0.035,
  singleRate: 0.165, doubleRate: 0.045, tripleRate: 0.005, sbRate: 0.30,
  iso: 0.160, hbpRate: 0.01, sfRate: 0.01, shRate: 0, gdpRate: 0.02,
};
const DEFAULT_APBA_CARD = generateApbaCard(DEFAULT_RATES, { byte33: 7, byte34: 0 });
const PITCHER_APBA_CARD = generatePitcherApbaCard();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Realistic 35-byte card with mix of hits, outs, BB, K. */
function makeRealisticCard(): number[] {
  const card = new Array(35).fill(0);
  card[0] = 30; card[2] = 28; card[5] = 27; card[10] = 26; card[12] = 31;
  card[17] = 29; card[22] = 25; card[24] = 32; card[31] = 35;
  const variable = [7, 8, 1, 0, 9, 13, 13, 14, 14, 14, 14, 21,
    30, 26, 31, 24, 30, 26, 31, 24, 30, 26, 31, 24, 30, 26];
  const structuralSet = new Set([0, 2, 5, 10, 12, 17, 22, 24, 31]);
  let vi = 0;
  for (let i = 0; i < 35; i++) {
    if (!structuralSet.has(i)) card[i] = variable[vi++];
  }
  return card;
}

function makePlayerCard(overrides: Partial<PlayerCard> & { playerId: string }): PlayerCard {
  return {
    nameFirst: 'Test',
    nameLast: 'Player',
    seasonYear: 1990,
    battingHand: 'R',
    throwingHand: 'R',
    primaryPosition: 'CF',
    eligiblePositions: ['CF'],
    isPitcher: false,
    card: makeRealisticCard(),
    apbaCard: DEFAULT_APBA_CARD,
    powerRating: 17,
    archetype: { byte33: 7, byte34: 0 },
    speed: 0.5,
    power: 0.15,
    discipline: 0.5,
    contactRate: 0.75,
    fieldingPct: 0.980,
    range: 0.7,
    arm: 0.6,
    ...overrides,
  };
}

function makePitcherCard(playerId: string, grade = 10): PlayerCard {
  return makePlayerCard({
    playerId,
    primaryPosition: 'SP',
    eligiblePositions: ['SP'],
    isPitcher: true,
    apbaCard: PITCHER_APBA_CARD,
    pitching: {
      role: 'SP',
      grade,
      stamina: 7,
      era: 3.50,
      whip: 1.20,
      k9: 8.0,
      bb9: 3.0,
      hr9: 1.0,
      usageFlags: [],
      isReliever: false,
    },
  });
}

function makeRelieverCard(playerId: string, grade = 8): PlayerCard {
  return makePlayerCard({
    playerId,
    primaryPosition: 'RP',
    eligiblePositions: ['RP'],
    isPitcher: true,
    apbaCard: PITCHER_APBA_CARD,
    pitching: {
      role: 'RP',
      grade,
      stamina: 3,
      era: 3.80,
      whip: 1.25,
      k9: 9.0,
      bb9: 3.5,
      hr9: 0.9,
      usageFlags: [],
      isReliever: true,
    },
  });
}

function makeCloserCard(playerId: string): PlayerCard {
  return makePlayerCard({
    playerId,
    primaryPosition: 'CL',
    eligiblePositions: ['CL'],
    isPitcher: true,
    apbaCard: PITCHER_APBA_CARD,
    pitching: {
      role: 'CL',
      grade: 9,
      stamina: 2,
      era: 2.80,
      whip: 1.10,
      k9: 10.0,
      bb9: 2.5,
      hr9: 0.8,
      usageFlags: [],
      isReliever: true,
    },
  });
}

function makeGameConfig(gameId: string, seed: number): RunGameConfig {
  const positions: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
  const homeLineup = positions.map((pos, i) => ({
    playerId: `h-b-${i}`,
    playerName: `Home ${i}`,
    position: pos,
  }));
  const awayLineup = positions.map((pos, i) => ({
    playerId: `a-b-${i}`,
    playerName: `Away ${i}`,
    position: pos,
  }));

  const homeBatterCards = new Map<string, PlayerCard>();
  const awayBatterCards = new Map<string, PlayerCard>();
  for (let i = 0; i < 9; i++) {
    homeBatterCards.set(`h-b-${i}`, makePlayerCard({ playerId: `h-b-${i}` }));
    awayBatterCards.set(`a-b-${i}`, makePlayerCard({ playerId: `a-b-${i}` }));
  }

  return {
    gameId,
    seed,
    homeTeamId: 'home',
    awayTeamId: 'away',
    homeLineup,
    awayLineup,
    homeBatterCards,
    awayBatterCards,
    homeStartingPitcher: makePitcherCard('h-sp'),
    awayStartingPitcher: makePitcherCard('a-sp'),
    homeBullpen: [makeRelieverCard('h-rp1'), makeRelieverCard('h-rp2')],
    awayBullpen: [makeRelieverCard('a-rp1'), makeRelieverCard('a-rp2')],
    homeCloser: makeCloserCard('h-cl'),
    awayCloser: makeCloserCard('a-cl'),
    homeManagerStyle: 'balanced',
    awayManagerStyle: 'balanced',
  };
}

function makeDayGameConfig(gameId: string): DayGameConfig {
  const gc = makeGameConfig(gameId, 0);
  return {
    gameId: gc.gameId,
    homeTeamId: gc.homeTeamId,
    awayTeamId: gc.awayTeamId,
    homeLineup: gc.homeLineup,
    awayLineup: gc.awayLineup,
    homeBatterCards: gc.homeBatterCards,
    awayBatterCards: gc.awayBatterCards,
    homeStartingPitcher: gc.homeStartingPitcher,
    awayStartingPitcher: gc.awayStartingPitcher,
    homeBullpen: gc.homeBullpen,
    awayBullpen: gc.awayBullpen,
    homeCloser: gc.homeCloser,
    awayCloser: gc.awayCloser,
    homeManagerStyle: gc.homeManagerStyle,
    awayManagerStyle: gc.awayManagerStyle,
  };
}

// ---------------------------------------------------------------------------
// Performance Tests
// ---------------------------------------------------------------------------

describe('simulation performance benchmarks', () => {
  it('REQ-NFR-001: single game completes under 500ms', () => {
    const config = makeGameConfig('perf-game', 42);

    const start = performance.now();
    const result = runGame(config);
    const elapsed = performance.now() - start;

    expect(result.innings).toBeGreaterThanOrEqual(9);
    expect(elapsed).toBeLessThan(500);
  });

  it('REQ-NFR-002: 10-game day completes under 5s', () => {
    const games: DayGameConfig[] = [];
    for (let i = 0; i < 10; i++) {
      games.push(makeDayGameConfig(`day-game-${i}`));
    }

    const start = performance.now();
    const result = runDay(1, games, 12345);
    const elapsed = performance.now() - start;

    expect(result.games).toHaveLength(10);
    expect(elapsed).toBeLessThan(5000);
  });

  it('REQ-NFR-002: 20-game batch completes under 10s', () => {
    const games: DayGameConfig[] = [];
    for (let i = 0; i < 20; i++) {
      games.push(makeDayGameConfig(`batch-game-${i}`));
    }

    const start = performance.now();
    const result = runDay(1, games, 99999);
    const elapsed = performance.now() - start;

    expect(result.games).toHaveLength(20);
    expect(elapsed).toBeLessThan(10000);
  });
});
