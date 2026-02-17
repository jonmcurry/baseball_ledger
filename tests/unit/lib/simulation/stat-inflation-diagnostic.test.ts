/**
 * Stat Inflation Diagnostic Test
 *
 * TDD: This test uses tight MLB-historical ranges to prove stat inflation exists
 * before fixes are applied, then validates fixes bring stats into range.
 *
 * Historical MLB benchmarks (1920s-2020s era averages):
 * - R/team/game: ~4.3-4.7 (target 4.5)
 * - OBP: ~.315-.330
 * - BB/team/game: ~3.0-3.5
 * - Hits/team/game: ~8.5-9.5
 */

import type { PlayerCard, Position } from '@lib/types/player';
import { runGame } from '@lib/simulation/game-runner';
import type { RunGameConfig } from '@lib/simulation/game-runner';
import { computeSlotAllocation, fillVariablePositions, applyGateValues } from '@lib/card-generator/value-mapper';
import { applyStructuralConstants, CARD_LENGTH, POWER_POSITION } from '@lib/card-generator/structural';
import { computePowerRating } from '@lib/card-generator/power-rating';
import { generatePitcherBattingCard } from '@lib/card-generator/pitcher-card';
import type { PlayerRates } from '@lib/card-generator/rate-calculator';
import type { CardValue } from '@lib/types/player';

// ---------------------------------------------------------------------------
// Helpers (same pattern as full-game-calibration.test.ts)
// ---------------------------------------------------------------------------

function buildCardFromRates(
  rates: PlayerRates,
  babip = 0.295,
  archByte33 = 7,
  archByte34 = 0,
): CardValue[] {
  const card: CardValue[] = new Array(CARD_LENGTH).fill(0);
  applyStructuralConstants(card);
  const { gateWalkCount, gateKCount } = applyGateValues(
    card, rates.walkRate, rates.strikeoutRate, rates.iso,
  );
  const alloc = computeSlotAllocation(rates, gateWalkCount, gateKCount, archByte33, archByte34);
  fillVariablePositions(card, alloc, babip);
  card[POWER_POSITION] = computePowerRating(rates.iso);
  card[33] = archByte33;
  card[34] = archByte34;
  return card;
}

function avgHitterRates(): PlayerRates {
  return {
    PA: 600, walkRate: 0.09, strikeoutRate: 0.17, homeRunRate: 0.035,
    singleRate: 0.165, doubleRate: 0.045, tripleRate: 0.005, sbRate: 0.30,
    iso: 0.160, hbpRate: 0.01, sfRate: 0.01, shRate: 0, gdpRate: 0.02,
  };
}

function powerHitterRates(): PlayerRates {
  return {
    PA: 650, walkRate: 0.12, strikeoutRate: 0.22, homeRunRate: 0.065,
    singleRate: 0.14, doubleRate: 0.055, tripleRate: 0.003, sbRate: 0.10,
    iso: 0.260, hbpRate: 0.01, sfRate: 0.01, shRate: 0, gdpRate: 0.02,
  };
}

function contactHitterRates(): PlayerRates {
  return {
    PA: 600, walkRate: 0.06, strikeoutRate: 0.08, homeRunRate: 0.01,
    singleRate: 0.22, doubleRate: 0.05, tripleRate: 0.015, sbRate: 0.50,
    iso: 0.090, hbpRate: 0.005, sfRate: 0.005, shRate: 0, gdpRate: 0.01,
  };
}

function weakHitterRates(): PlayerRates {
  return {
    PA: 450, walkRate: 0.07, strikeoutRate: 0.25, homeRunRate: 0.02,
    singleRate: 0.12, doubleRate: 0.03, tripleRate: 0.003, sbRate: 0.15,
    iso: 0.100, hbpRate: 0.005, sfRate: 0.005, shRate: 0, gdpRate: 0.015,
  };
}

function makePlayerCard(overrides: Partial<PlayerCard> & { playerId: string }): PlayerCard {
  const arch = overrides.archetype ?? { byte33: 7, byte34: 0 };
  return {
    nameFirst: 'Test', nameLast: 'Player', seasonYear: 1990,
    battingHand: 'R', throwingHand: 'R', primaryPosition: 'CF',
    eligiblePositions: ['CF'], isPitcher: false,
    card: buildCardFromRates(avgHitterRates(), 0.295, arch.byte33, arch.byte34),
    powerRating: 17, archetype: arch, speed: 0.5, power: 0.15,
    discipline: 0.5, contactRate: 0.75, fieldingPct: 0.980, range: 0.7, arm: 0.6,
    ...overrides,
  };
}

function makePitcherCard(overrides: Partial<PlayerCard> & { playerId: string }): PlayerCard {
  return makePlayerCard({
    primaryPosition: 'SP', eligiblePositions: ['SP'], isPitcher: true,
    card: generatePitcherBattingCard(), powerRating: 13,
    pitching: {
      role: 'SP', grade: 8, stamina: 7, era: 3.50, whip: 1.20,
      k9: 8.0, bb9: 3.0, hr9: 1.0, usageFlags: [], isReliever: false,
    },
    ...overrides,
  });
}

function makeRelieverCard(playerId: string, grade = 8): PlayerCard {
  return makePlayerCard({
    playerId, primaryPosition: 'RP', eligiblePositions: ['RP'], isPitcher: true,
    card: generatePitcherBattingCard(), powerRating: 13,
    pitching: {
      role: 'RP', grade, stamina: 3, era: 3.80, whip: 1.25,
      k9: 9.0, bb9: 3.5, hr9: 0.9, usageFlags: [], isReliever: true,
    },
  });
}

function makeCloserCard(playerId: string, grade = 9): PlayerCard {
  return makePlayerCard({
    playerId, primaryPosition: 'CL', eligiblePositions: ['CL'], isPitcher: true,
    card: generatePitcherBattingCard(), powerRating: 13,
    pitching: {
      role: 'CL', grade, stamina: 2, era: 2.80, whip: 1.10,
      k9: 10.0, bb9: 2.5, hr9: 0.8, usageFlags: [], isReliever: true,
    },
  });
}

function makeConfig(seed = 42): RunGameConfig {
  const positions: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
  const hitterProfiles = [
    contactHitterRates(), avgHitterRates(), powerHitterRates(), powerHitterRates(),
    avgHitterRates(), avgHitterRates(), weakHitterRates(), weakHitterRates(), weakHitterRates(),
  ];
  const battingHands: ('R' | 'L' | 'S')[] = ['L', 'R', 'R', 'R', 'L', 'R', 'S', 'R', 'L'];
  const archetypes = [
    { byte33: 0, byte34: 2 }, { byte33: 7, byte34: 0 }, { byte33: 1, byte34: 0 },
    { byte33: 1, byte34: 0 }, { byte33: 7, byte34: 0 }, { byte33: 7, byte34: 0 },
    { byte33: 7, byte34: 0 }, { byte33: 7, byte34: 0 }, { byte33: 6, byte34: 0 },
  ];

  const homeLineup = positions.map((pos, i) => ({
    playerId: `home-${i}`, playerName: `Home Player ${i}`, position: pos,
  }));
  const awayLineup = positions.map((pos, i) => ({
    playerId: `away-${i}`, playerName: `Away Player ${i}`, position: pos,
  }));

  const homeBatters = new Map<string, PlayerCard>();
  const awayBatters = new Map<string, PlayerCard>();

  for (let i = 0; i < 9; i++) {
    const rates = hitterProfiles[i];
    const card = buildCardFromRates(rates, 0.295, archetypes[i].byte33, archetypes[i].byte34);
    homeBatters.set(`home-${i}`, makePlayerCard({
      playerId: `home-${i}`, card, battingHand: battingHands[i],
      archetype: archetypes[i], speed: rates.sbRate > 0.3 ? 0.7 : 0.4,
      contactRate: 1 - rates.strikeoutRate, power: rates.homeRunRate * 10,
      discipline: rates.walkRate * 5,
    }));
    awayBatters.set(`away-${i}`, makePlayerCard({
      playerId: `away-${i}`, card, battingHand: battingHands[i],
      archetype: archetypes[i], speed: rates.sbRate > 0.3 ? 0.7 : 0.4,
      contactRate: 1 - rates.strikeoutRate, power: rates.homeRunRate * 10,
      discipline: rates.walkRate * 5,
    }));
  }

  return {
    gameId: `diag-${seed}`, seed,
    homeTeamId: 'team-home', awayTeamId: 'team-away',
    homeLineup, awayLineup,
    homeBatterCards: homeBatters, awayBatterCards: awayBatters,
    homeStartingPitcher: makePitcherCard({ playerId: 'home-sp' }),
    awayStartingPitcher: makePitcherCard({ playerId: 'away-sp' }),
    homeBullpen: [makeRelieverCard('home-rp1'), makeRelieverCard('home-rp2')],
    awayBullpen: [makeRelieverCard('away-rp1'), makeRelieverCard('away-rp2')],
    homeCloser: makeCloserCard('home-cl'),
    awayCloser: makeCloserCard('away-cl'),
    homeManagerStyle: 'balanced', awayManagerStyle: 'balanced',
  };
}

// ---------------------------------------------------------------------------
// Aggregate runner
// ---------------------------------------------------------------------------

function runDiagnosticGames(count: number) {
  let totalHomeRuns = 0;
  let totalAwayRuns = 0;
  let totalHomeAB = 0;
  let totalAwayAB = 0;
  let totalHomeH = 0;
  let totalAwayH = 0;
  let totalHomeBB = 0;
  let totalAwayBB = 0;
  let totalHomeHBP = 0;
  let totalAwayHBP = 0;
  let totalHomeSF = 0;
  let totalAwaySF = 0;
  let totalHomeSO = 0;
  let totalAwaySO = 0;
  let totalHomeHR = 0;
  let totalAwayHR = 0;
  let totalHomePAs = 0;
  let totalAwayPAs = 0;

  const homePlayerIds = new Set(makeConfig().homeLineup.map(s => s.playerId));

  for (let seed = 1; seed <= count; seed++) {
    const result = runGame(makeConfig(seed));
    totalHomeRuns += result.homeScore;
    totalAwayRuns += result.awayScore;

    for (const line of result.playerBattingLines) {
      const pa = line.AB + line.BB + line.HBP + line.SF;
      if (homePlayerIds.has(line.playerId)) {
        totalHomePAs += pa;
        totalHomeAB += line.AB;
        totalHomeH += line.H;
        totalHomeBB += line.BB;
        totalHomeHBP += line.HBP;
        totalHomeSF += line.SF;
        totalHomeSO += line.SO;
        totalHomeHR += line.HR;
      } else {
        totalAwayPAs += pa;
        totalAwayAB += line.AB;
        totalAwayH += line.H;
        totalAwayBB += line.BB;
        totalAwayHBP += line.HBP;
        totalAwaySF += line.SF;
        totalAwaySO += line.SO;
        totalAwayHR += line.HR;
      }
    }
  }

  const totalPAs = totalHomePAs + totalAwayPAs;
  const totalAB = totalHomeAB + totalAwayAB;
  const totalH = totalHomeH + totalAwayH;
  const totalBB = totalHomeBB + totalAwayBB;
  const totalHBP = totalHomeHBP + totalAwayHBP;
  const totalSF = totalHomeSF + totalAwaySF;

  return {
    games: count,
    avgRunsPerTeamPerGame: (totalHomeRuns + totalAwayRuns) / (count * 2),
    avgPAPerTeamPerGame: totalPAs / (count * 2),
    homeBA: totalHomeAB > 0 ? totalHomeH / totalHomeAB : 0,
    awayBA: totalAwayAB > 0 ? totalAwayH / totalAwayAB : 0,
    overallBA: totalAB > 0 ? totalH / totalAB : 0,
    overallOBP: totalPAs > 0 ? (totalH + totalBB + totalHBP) / (totalAB + totalBB + totalHBP + totalSF) : 0,
    avgBBPerTeamPerGame: totalBB / (count * 2),
    avgSOPerTeamPerGame: (totalHomeSO + totalAwaySO) / (count * 2),
    avgHRPerTeamPerGame: (totalHomeHR + totalAwayHR) / (count * 2),
    avgHitsPerTeamPerGame: totalH / (count * 2),
  };
}

// ---------------------------------------------------------------------------
// Tests with tight MLB-historical ranges
// ---------------------------------------------------------------------------

describe('Stat Inflation Diagnostic', () => {
  const GAME_COUNT = 200;

  it('runs per team per game is in tight range [3.8, 5.2]', () => {
    const stats = runDiagnosticGames(GAME_COUNT);
    expect(stats.avgRunsPerTeamPerGame).toBeGreaterThanOrEqual(3.8);
    expect(stats.avgRunsPerTeamPerGame).toBeLessThanOrEqual(5.2);
  });

  it('OBP is in realistic range [.300, .345]', () => {
    const stats = runDiagnosticGames(GAME_COUNT);
    expect(stats.overallOBP).toBeGreaterThanOrEqual(0.300);
    expect(stats.overallOBP).toBeLessThanOrEqual(0.345);
  });

  it('hits per team per game is in realistic range [7.5, 10.0]', () => {
    const stats = runDiagnosticGames(GAME_COUNT);
    expect(stats.avgHitsPerTeamPerGame).toBeGreaterThanOrEqual(7.5);
    expect(stats.avgHitsPerTeamPerGame).toBeLessThanOrEqual(10.0);
  });

  it('reports full diagnostic breakdown', () => {
    const stats = runDiagnosticGames(GAME_COUNT);
    console.log('[Stat Inflation Diagnostic Report]');
    console.log(`  Games: ${stats.games}`);
    console.log(`  R/team/game: ${stats.avgRunsPerTeamPerGame.toFixed(2)}`);
    console.log(`  PA/team/game: ${stats.avgPAPerTeamPerGame.toFixed(1)}`);
    console.log(`  BA: ${stats.overallBA.toFixed(3)} (Home=${stats.homeBA.toFixed(3)}, Away=${stats.awayBA.toFixed(3)})`);
    console.log(`  OBP: ${stats.overallOBP.toFixed(3)}`);
    console.log(`  H/team/game: ${stats.avgHitsPerTeamPerGame.toFixed(2)}`);
    console.log(`  BB/team/game: ${stats.avgBBPerTeamPerGame.toFixed(2)}`);
    console.log(`  SO/team/game: ${stats.avgSOPerTeamPerGame.toFixed(2)}`);
    console.log(`  HR/team/game: ${stats.avgHRPerTeamPerGame.toFixed(2)}`);
    expect(true).toBe(true);
  });
});
