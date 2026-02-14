/**
 * Determinism Tests
 *
 * REQ-NFR-007: Simulation must be deterministic given the same seed.
 * REQ-TEST-014: Blocking determinism test.
 *
 * Verifies that running the same game twice with the same seed produces
 * identical results -- scores, play-by-play, box scores, and stat lines.
 */

import type { PlayerCard, Position } from '../../../../src/lib/types/player';
import { runGame } from '../../../../src/lib/simulation/game-runner';
import type { RunGameConfig } from '../../../../src/lib/simulation/game-runner';

// ---------------------------------------------------------------------------
// Test Helpers
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

function makeRelieverCard(playerId: string): PlayerCard {
  return makePlayerCard({
    playerId,
    primaryPosition: 'RP',
    eligiblePositions: ['RP'],
    isPitcher: true,
    pitching: {
      role: 'RP',
      grade: 8,
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

function makeConfig(seed: number): RunGameConfig {
  const positions: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
  const homeLineup = positions.map((pos, i) => ({
    playerId: `h-${i}`,
    playerName: `Home ${i}`,
    position: pos,
  }));
  const awayLineup = positions.map((pos, i) => ({
    playerId: `a-${i}`,
    playerName: `Away ${i}`,
    position: pos,
  }));

  const homeBatterCards = new Map<string, PlayerCard>();
  const awayBatterCards = new Map<string, PlayerCard>();
  for (let i = 0; i < 9; i++) {
    homeBatterCards.set(`h-${i}`, makePlayerCard({ playerId: `h-${i}`, speed: 0.4 + i * 0.05 }));
    awayBatterCards.set(`a-${i}`, makePlayerCard({ playerId: `a-${i}`, speed: 0.4 + i * 0.05 }));
  }

  return {
    gameId: 'det-game',
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('determinism (REQ-NFR-007)', () => {
  it('same seed produces identical game results', () => {
    const config1 = makeConfig(42);
    const config2 = makeConfig(42);

    const result1 = runGame(config1);
    const result2 = runGame(config2);

    expect(result1.homeScore).toBe(result2.homeScore);
    expect(result1.awayScore).toBe(result2.awayScore);
    expect(result1.innings).toBe(result2.innings);
  });

  it('same seed produces identical play-by-play', () => {
    const result1 = runGame(makeConfig(42));
    const result2 = runGame(makeConfig(42));

    expect(result1.playByPlay).toHaveLength(result2.playByPlay.length);
    for (let i = 0; i < result1.playByPlay.length; i++) {
      expect(result1.playByPlay[i].description).toBe(result2.playByPlay[i].description);
    }
  });

  it('same seed produces identical box scores', () => {
    const result1 = runGame(makeConfig(42));
    const result2 = runGame(makeConfig(42));

    expect(result1.boxScore.awayHits).toBe(result2.boxScore.awayHits);
    expect(result1.boxScore.homeHits).toBe(result2.boxScore.homeHits);
    expect(result1.boxScore.awayErrors).toBe(result2.boxScore.awayErrors);
    expect(result1.boxScore.homeErrors).toBe(result2.boxScore.homeErrors);
    expect(result1.boxScore.lineScore.away).toEqual(result2.boxScore.lineScore.away);
    expect(result1.boxScore.lineScore.home).toEqual(result2.boxScore.lineScore.home);
  });

  it('same seed produces identical batting lines', () => {
    const result1 = runGame(makeConfig(42));
    const result2 = runGame(makeConfig(42));

    expect(result1.playerBattingLines).toHaveLength(result2.playerBattingLines.length);
    for (let i = 0; i < result1.playerBattingLines.length; i++) {
      expect(result1.playerBattingLines[i]).toEqual(result2.playerBattingLines[i]);
    }
  });

  it('different seeds produce different results', () => {
    const result1 = runGame(makeConfig(42));
    const result2 = runGame(makeConfig(999));

    // With different seeds, the play-by-play should differ
    // (extremely unlikely to be identical with different seeds)
    const pbp1Desc = result1.playByPlay.map((p) => p.description).join('|');
    const pbp2Desc = result2.playByPlay.map((p) => p.description).join('|');
    expect(pbp1Desc).not.toBe(pbp2Desc);
  });

  it('deterministic across 5 consecutive runs', () => {
    const results = Array.from({ length: 5 }, () => runGame(makeConfig(777)));

    for (let i = 1; i < results.length; i++) {
      expect(results[i].homeScore).toBe(results[0].homeScore);
      expect(results[i].awayScore).toBe(results[0].awayScore);
      expect(results[i].innings).toBe(results[0].innings);
      expect(results[i].winningPitcherId).toBe(results[0].winningPitcherId);
      expect(results[i].losingPitcherId).toBe(results[0].losingPitcherId);
    }
  });
});
