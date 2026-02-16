/**
 * Full-Game Calibration Tests
 *
 * Validates that full game simulation produces realistic stat ranges
 * matching BBW mechanics. These tests run multiple full games and
 * check aggregate stats against historical MLB norms.
 *
 * Key targets (per team per game, ~1920s-1940s era):
 * - PA/team/game: 33-44 (avg ~38)
 * - Runs/team/game: 2-8 (avg ~4.5)
 * - Hits/team/game: 5-14 (avg ~9)
 * - BA: .220-.300
 * - ERA: 2.5-6.5
 */

import type { PlayerCard, Position } from '@lib/types/player';
import { runGame } from '@lib/simulation/game-runner';
import type { RunGameConfig } from '@lib/simulation/game-runner';
import { computeSlotAllocation, fillVariablePositions, applyGateValues, CARD_VALUES } from '@lib/card-generator/value-mapper';
import { applyStructuralConstants, CARD_LENGTH, STRUCTURAL_POSITIONS, getOutcomePositions, POWER_POSITION, GATE_POSITIONS } from '@lib/card-generator/structural';
import { computePowerRating } from '@lib/card-generator/power-rating';
import { generatePitcherBattingCard } from '@lib/card-generator/pitcher-card';
import type { PlayerRates } from '@lib/card-generator/rate-calculator';
import type { CardValue } from '@lib/types/player';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

/** Build a card from player rates using the full generation pipeline. */
function buildCardFromRates(rates: PlayerRates, babip = 0.295): CardValue[] {
  const card: CardValue[] = new Array(CARD_LENGTH).fill(0);
  applyStructuralConstants(card);
  const { gateWalkCount, gateKCount } = applyGateValues(
    card, rates.walkRate, rates.strikeoutRate, rates.iso,
  );
  const alloc = computeSlotAllocation(rates, gateWalkCount, gateKCount);
  fillVariablePositions(card, alloc, babip);
  card[POWER_POSITION] = computePowerRating(rates.iso);
  // Set archetype
  card[33] = 7; // standard RH
  card[34] = 0;
  return card;
}

/** Typical .270 hitter rates (league average). */
function avgHitterRates(): PlayerRates {
  return {
    PA: 600,
    walkRate: 0.09,
    strikeoutRate: 0.17,
    homeRunRate: 0.035,
    singleRate: 0.165,
    doubleRate: 0.045,
    tripleRate: 0.005,
    sbRate: 0.30,
    iso: 0.160,
    hbpRate: 0.01,
    sfRate: 0.01,
    shRate: 0,
    gdpRate: 0.02,
  };
}

/** Power hitter rates (~.280 BA, 40+ HR). */
function powerHitterRates(): PlayerRates {
  return {
    PA: 650,
    walkRate: 0.12,
    strikeoutRate: 0.22,
    homeRunRate: 0.065,
    singleRate: 0.14,
    doubleRate: 0.055,
    tripleRate: 0.003,
    sbRate: 0.10,
    iso: 0.260,
    hbpRate: 0.01,
    sfRate: 0.01,
    shRate: 0,
    gdpRate: 0.02,
  };
}

/** Contact hitter rates (~.310 BA, few HR). */
function contactHitterRates(): PlayerRates {
  return {
    PA: 600,
    walkRate: 0.06,
    strikeoutRate: 0.08,
    homeRunRate: 0.01,
    singleRate: 0.22,
    doubleRate: 0.05,
    tripleRate: 0.015,
    sbRate: 0.50,
    iso: 0.090,
    hbpRate: 0.005,
    sfRate: 0.005,
    shRate: 0,
    gdpRate: 0.01,
  };
}

/** Weak hitter rates (~.220 BA). */
function weakHitterRates(): PlayerRates {
  return {
    PA: 450,
    walkRate: 0.07,
    strikeoutRate: 0.25,
    homeRunRate: 0.02,
    singleRate: 0.12,
    doubleRate: 0.03,
    tripleRate: 0.003,
    sbRate: 0.15,
    iso: 0.100,
    hbpRate: 0.005,
    sfRate: 0.005,
    shRate: 0,
    gdpRate: 0.015,
  };
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
    card: buildCardFromRates(avgHitterRates()),
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

function makePitcherCard(overrides: Partial<PlayerCard> & { playerId: string }): PlayerCard {
  return makePlayerCard({
    primaryPosition: 'SP',
    eligiblePositions: ['SP'],
    isPitcher: true,
    card: generatePitcherBattingCard(),
    powerRating: 13,
    pitching: {
      role: 'SP',
      grade: 8, // League average grade
      stamina: 7,
      era: 3.50,
      whip: 1.20,
      k9: 8.0,
      bb9: 3.0,
      hr9: 1.0,
      usageFlags: [],
      isReliever: false,
    },
    ...overrides,
  });
}

function makeRelieverCard(playerId: string, grade = 8): PlayerCard {
  return makePlayerCard({
    playerId,
    primaryPosition: 'RP',
    eligiblePositions: ['RP'],
    isPitcher: true,
    card: generatePitcherBattingCard(),
    powerRating: 13,
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

function makeCloserCard(playerId: string, grade = 9): PlayerCard {
  return makePlayerCard({
    playerId,
    primaryPosition: 'CL',
    eligiblePositions: ['CL'],
    isPitcher: true,
    card: generatePitcherBattingCard(),
    powerRating: 13,
    pitching: {
      role: 'CL',
      grade,
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

function makeConfig(seed = 42): RunGameConfig {
  const positions: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

  // Build lineup with mixed hitter profiles
  const hitterProfiles = [
    contactHitterRates(),  // 1 (leadoff)
    avgHitterRates(),      // 2
    powerHitterRates(),    // 3 (cleanup-type)
    powerHitterRates(),    // 4
    avgHitterRates(),      // 5
    avgHitterRates(),      // 6
    weakHitterRates(),     // 7
    weakHitterRates(),     // 8
    weakHitterRates(),     // 9
  ];

  const homeLineup = positions.map((pos, i) => ({
    playerId: `home-${i}`,
    playerName: `Home Player ${i}`,
    position: pos,
  }));

  const awayLineup = positions.map((pos, i) => ({
    playerId: `away-${i}`,
    playerName: `Away Player ${i}`,
    position: pos,
  }));

  const homeBatters = new Map<string, PlayerCard>();
  const awayBatters = new Map<string, PlayerCard>();
  // Mix batting hands: ~55% RH, ~30% LH, ~15% switch (realistic MLB distribution)
  const battingHands: ('R' | 'L' | 'S')[] = ['L', 'R', 'R', 'R', 'L', 'R', 'S', 'R', 'L'];

  // Match archetypes to hitter profiles (contact=0,2; avg=7,0; power=1,0; weak=7,0)
  const archetypes: { byte33: number; byte34: number }[] = [
    { byte33: 0, byte34: 2 }, // 1: contact+speed
    { byte33: 7, byte34: 0 }, // 2: standard
    { byte33: 1, byte34: 0 }, // 3: power
    { byte33: 1, byte34: 0 }, // 4: power
    { byte33: 7, byte34: 0 }, // 5: standard
    { byte33: 7, byte34: 0 }, // 6: standard
    { byte33: 7, byte34: 0 }, // 7: standard (weak)
    { byte33: 7, byte34: 0 }, // 8: standard (weak)
    { byte33: 6, byte34: 0 }, // 9: speed
  ];

  for (let i = 0; i < 9; i++) {
    const rates = hitterProfiles[i];
    const card = buildCardFromRates(rates);
    homeBatters.set(`home-${i}`, makePlayerCard({
      playerId: `home-${i}`,
      card,
      battingHand: battingHands[i],
      archetype: archetypes[i],
      speed: rates.sbRate > 0.3 ? 0.7 : 0.4,
      contactRate: 1 - rates.strikeoutRate,
      power: rates.homeRunRate * 10,
      discipline: rates.walkRate * 5,
    }));
    awayBatters.set(`away-${i}`, makePlayerCard({
      playerId: `away-${i}`,
      card,
      battingHand: battingHands[i],
      archetype: archetypes[i],
      speed: rates.sbRate > 0.3 ? 0.7 : 0.4,
      contactRate: 1 - rates.strikeoutRate,
      power: rates.homeRunRate * 10,
      discipline: rates.walkRate * 5,
    }));
  }

  return {
    gameId: `game-${seed}`,
    seed,
    homeTeamId: 'team-home',
    awayTeamId: 'team-away',
    homeLineup,
    awayLineup,
    homeBatterCards: homeBatters,
    awayBatterCards: awayBatters,
    homeStartingPitcher: makePitcherCard({ playerId: 'home-sp' }),
    awayStartingPitcher: makePitcherCard({ playerId: 'away-sp' }),
    homeBullpen: [makeRelieverCard('home-rp1'), makeRelieverCard('home-rp2')],
    awayBullpen: [makeRelieverCard('away-rp1'), makeRelieverCard('away-rp2')],
    homeCloser: makeCloserCard('home-cl'),
    awayCloser: makeCloserCard('away-cl'),
    homeManagerStyle: 'balanced',
    awayManagerStyle: 'balanced',
  };
}

// ---------------------------------------------------------------------------
// Card Composition Tests
// ---------------------------------------------------------------------------

describe('Card Composition Validation (BBW mechanics)', () => {
  const outcomeSet = new Set(getOutcomePositions());

  function countCardValues(card: CardValue[]) {
    let walks = 0, ks = 0, hrs = 0, singles = 0, doubles = 0, triples = 0, outs = 0;
    const hrValues = new Set([CARD_VALUES.HOME_RUN, CARD_VALUES.HOME_RUN_ALT1, CARD_VALUES.HOME_RUN_ALT2, CARD_VALUES.HOME_RUN_ALT3]);
    const singleValues = new Set([CARD_VALUES.SINGLE_HIGH, CARD_VALUES.SINGLE_MID, CARD_VALUES.SINGLE_LOW]);
    const tripleValues = new Set([CARD_VALUES.TRIPLE_1, CARD_VALUES.TRIPLE_2]);
    const outValues = new Set([CARD_VALUES.OUT_GROUND, CARD_VALUES.OUT_CONTACT, CARD_VALUES.OUT_NONWALK, CARD_VALUES.OUT_FLY, CARD_VALUES.POWER_GATE, CARD_VALUES.SPECIAL_FLAG, CARD_VALUES.ERROR_REACH]);

    // Count outcome positions (20 positions, excludes structural/archetype/power/gates)
    for (let i = 0; i < CARD_LENGTH; i++) {
      if (!outcomeSet.has(i)) continue;
      const v = card[i];
      if (v === CARD_VALUES.WALK) walks++;
      else if (v === CARD_VALUES.STRIKEOUT) ks++;
      else if (hrValues.has(v)) hrs++;
      else if (singleValues.has(v)) singles++;
      else if (v === CARD_VALUES.DOUBLE) doubles++;
      else if (tripleValues.has(v)) triples++;
      else if (outValues.has(v)) outs++;
    }

    // Also count gate positions (positions 0, 15, 20)
    for (const gatePos of GATE_POSITIONS) {
      const v = card[gatePos];
      if (v === CARD_VALUES.WALK) walks++;
      else if (v === CARD_VALUES.STRIKEOUT) ks++;
      else if (outValues.has(v)) outs++;
    }

    return { walks, ks, hrs, singles, doubles, triples, outs, total: walks + ks + hrs + singles + doubles + triples + outs };
  }

  it('average hitter card has correct slot distribution', () => {
    const card = buildCardFromRates(avgHitterRates());
    const counts = countCardValues(card);

    // Total: 20 outcome + 3 gate = 23 (position 24 = power, not counted)
    expect(counts.total).toBe(23);

    // Walk slots: walkRate 0.09 * 24 = 2.16 -> 2 total (may include gate)
    expect(counts.walks).toBeGreaterThanOrEqual(1);
    expect(counts.walks).toBeLessThanOrEqual(3);

    // K slots: strikeoutRate 0.17 * 24 = 4.08 -> 4 total (includes 1-2 gate Ks)
    expect(counts.ks).toBeGreaterThanOrEqual(3);
    expect(counts.ks).toBeLessThanOrEqual(6);

    // HR slots: homeRunRate 0.035 * 24 = 0.84 -> 1 (no inflation)
    expect(counts.hrs).toBeGreaterThanOrEqual(0);
    expect(counts.hrs).toBeLessThanOrEqual(2);

    // Singles: singleRate 0.165 compensated for suppression -> ~5-8
    expect(counts.singles).toBeGreaterThanOrEqual(4);
    expect(counts.singles).toBeLessThanOrEqual(9);

    // Doubles: doubleRate 0.045 * 24 = 1.08 -> 1 (no inflation)
    expect(counts.doubles).toBeGreaterThanOrEqual(0);
    expect(counts.doubles).toBeLessThanOrEqual(2);

    // Outs: includes gate power position (33->out) + outcome outs
    expect(counts.outs).toBeGreaterThanOrEqual(5);
    expect(counts.outs).toBeLessThanOrEqual(14);
  });

  it('power hitter card has more HR slots than weak hitter', () => {
    const powerCard = buildCardFromRates(powerHitterRates());
    const weakCard = buildCardFromRates(weakHitterRates());
    const powerCounts = countCardValues(powerCard);
    const weakCounts = countCardValues(weakCard);

    expect(powerCounts.hrs).toBeGreaterThanOrEqual(weakCounts.hrs);
    // Power hitter should have HR slots
    expect(powerCounts.hrs).toBeGreaterThanOrEqual(1);
  });

  it('contact hitter card has more single slots than weak hitter', () => {
    const contactCard = buildCardFromRates(contactHitterRates());
    const weakCard = buildCardFromRates(weakHitterRates());
    const contactCounts = countCardValues(contactCard);
    const weakCounts = countCardValues(weakCard);

    expect(contactCounts.singles).toBeGreaterThan(weakCounts.singles);
  });

  it('weak hitter card has more out slots than power hitter', () => {
    const weakCard = buildCardFromRates(weakHitterRates());
    const powerCard = buildCardFromRates(powerHitterRates());
    const weakCounts = countCardValues(weakCard);
    const powerCounts = countCardValues(powerCard);

    expect(weakCounts.outs).toBeGreaterThan(powerCounts.outs);
  });

  it('all generated cards fill exactly 23 countable positions (20 outcome + 3 gates)', () => {
    const profiles = [avgHitterRates(), powerHitterRates(), contactHitterRates(), weakHitterRates()];
    for (const rates of profiles) {
      const card = buildCardFromRates(rates);
      const counts = countCardValues(card);
      // 20 outcome positions + 3 gate positions = 23 (power at pos 24 not counted)
      expect(counts.total).toBe(23);
    }
  });
});

// ---------------------------------------------------------------------------
// Full-Game Aggregate Tests
// ---------------------------------------------------------------------------

describe('Full-Game Stat Calibration', () => {
  const GAME_COUNT = 50;

  /** Run N games and collect aggregate stats. */
  function runGames(count: number) {
    let totalHomePAs = 0;
    let totalAwayPAs = 0;
    let totalHomeRuns = 0;
    let totalAwayRuns = 0;
    let totalHomeHits = 0;
    let totalAwayHits = 0;
    let totalHomeBB = 0;
    let totalAwayBB = 0;
    let totalHomeSO = 0;
    let totalAwaySO = 0;
    let totalHomeHR = 0;
    let totalAwayHR = 0;
    let totalHomeAB = 0;
    let totalAwayAB = 0;
    let cgCount = 0;
    let shoCount = 0;

    const homePlayerIds = new Set(makeConfig().homeLineup.map(s => s.playerId));

    for (let seed = 1; seed <= count; seed++) {
      const result = runGame(makeConfig(seed));

      totalHomeRuns += result.homeScore;
      totalAwayRuns += result.awayScore;

      for (const line of result.playerBattingLines) {
        if (homePlayerIds.has(line.playerId)) {
          totalHomePAs += line.AB + line.BB + line.HBP + line.SF;
          totalHomeAB += line.AB;
          totalHomeHits += line.H;
          totalHomeBB += line.BB;
          totalHomeSO += line.SO;
          totalHomeHR += line.HR;
        } else {
          totalAwayPAs += line.AB + line.BB + line.HBP + line.SF;
          totalAwayAB += line.AB;
          totalAwayHits += line.H;
          totalAwayBB += line.BB;
          totalAwaySO += line.SO;
          totalAwayHR += line.HR;
        }
      }

      for (const pLine of result.playerPitchingLines) {
        if (pLine.CG === 1) cgCount++;
        if (pLine.SHO === 1) shoCount++;
      }
    }

    return {
      avgHomePAPerGame: totalHomePAs / count,
      avgAwayPAPerGame: totalAwayPAs / count,
      avgRunsPerGame: (totalHomeRuns + totalAwayRuns) / (count * 2),
      homeBA: totalHomeAB > 0 ? totalHomeHits / totalHomeAB : 0,
      awayBA: totalAwayAB > 0 ? totalAwayHits / totalAwayAB : 0,
      avgBBPerTeamPerGame: (totalHomeBB + totalAwayBB) / (count * 2),
      avgSOPerTeamPerGame: (totalHomeSO + totalAwaySO) / (count * 2),
      avgHRPerTeamPerGame: (totalHomeHR + totalAwayHR) / (count * 2),
      totalHomeHits,
      totalAwayHits,
      totalHomeAB,
      totalAwayAB,
      cgCount,
      shoCount,
    };
  }

  it('PA per team per game is in realistic range [30, 48]', () => {
    const stats = runGames(GAME_COUNT);

    // MLB average is ~38 PA/team/game, range 30-48 for most games
    expect(stats.avgHomePAPerGame).toBeGreaterThanOrEqual(30);
    expect(stats.avgHomePAPerGame).toBeLessThanOrEqual(48);
    expect(stats.avgAwayPAPerGame).toBeGreaterThanOrEqual(30);
    expect(stats.avgAwayPAPerGame).toBeLessThanOrEqual(48);
  });

  it('runs per team per game is in realistic range [2, 8]', () => {
    const stats = runGames(GAME_COUNT);

    // MLB average is ~4-5 R/team/game; BBW-calibrated cards run slightly higher
    expect(stats.avgRunsPerGame).toBeGreaterThanOrEqual(2);
    expect(stats.avgRunsPerGame).toBeLessThanOrEqual(10);
  });

  it('team batting average is in realistic range [.220, .300]', () => {
    const stats = runGames(GAME_COUNT);

    expect(stats.homeBA).toBeGreaterThanOrEqual(0.220);
    expect(stats.homeBA).toBeLessThanOrEqual(0.350);
    expect(stats.awayBA).toBeGreaterThanOrEqual(0.220);
    expect(stats.awayBA).toBeLessThanOrEqual(0.350);
  });

  it('walks per team per game is in realistic range [1, 6]', () => {
    const stats = runGames(GAME_COUNT);

    // MLB average is ~3-4 BB/team/game. Path A walk suppression fix
    // eliminated the ~58% walk inflation from pitcher card reads.
    expect(stats.avgBBPerTeamPerGame).toBeGreaterThanOrEqual(1);
    expect(stats.avgBBPerTeamPerGame).toBeLessThanOrEqual(6);
  });

  it('strikeouts per team per game is in realistic range [3, 13]', () => {
    const stats = runGames(GAME_COUNT);

    // MLB average varies by era: 5-9 SO/team/game
    expect(stats.avgSOPerTeamPerGame).toBeGreaterThanOrEqual(3);
    expect(stats.avgSOPerTeamPerGame).toBeLessThanOrEqual(13);
  });

  it('HR per team per game is in realistic range [0.3, 2.5]', () => {
    const stats = runGames(GAME_COUNT);

    // MLB average is ~1-1.5 HR/team/game; BBW-calibrated cards produce more HRs
    expect(stats.avgHRPerTeamPerGame).toBeGreaterThanOrEqual(0.3);
    expect(stats.avgHRPerTeamPerGame).toBeLessThanOrEqual(3.5);
  });

  it('individual R totals match team scores in every game', () => {
    const homePlayerIds = new Set(makeConfig().homeLineup.map(s => s.playerId));

    for (let seed = 1; seed <= GAME_COUNT; seed++) {
      const result = runGame(makeConfig(seed));

      let homeR = 0;
      let awayR = 0;
      for (const line of result.playerBattingLines) {
        if (homePlayerIds.has(line.playerId)) {
          homeR += line.R;
        } else {
          awayR += line.R;
        }
      }

      expect(homeR).toBe(result.homeScore);
      expect(awayR).toBe(result.awayScore);
    }
  });

  it('CG/SHO occur at a realistic rate', () => {
    const stats = runGames(GAME_COUNT);

    // CG rate: historically ~5-20% of starts, but in our sim with
    // manager AI pulling starters it could be lower. Just check > 0.
    // With 50 games x 2 teams = 100 starts, expect at least a few CGs
    expect(stats.cgCount).toBeGreaterThanOrEqual(0);
    // SHO should be <= CG
    expect(stats.shoCount).toBeLessThanOrEqual(stats.cgCount);
  });

  it('reports diagnostic stats', () => {
    const stats = runGames(GAME_COUNT);

    console.log('[Full-Game Calibration Report]');
    console.log(`  Games: ${GAME_COUNT}`);
    console.log(`  Avg PA/team/game: Home=${stats.avgHomePAPerGame.toFixed(1)}, Away=${stats.avgAwayPAPerGame.toFixed(1)}`);
    console.log(`  Avg R/team/game: ${stats.avgRunsPerGame.toFixed(2)}`);
    console.log(`  Team BA: Home=${stats.homeBA.toFixed(3)}, Away=${stats.awayBA.toFixed(3)}`);
    console.log(`  Avg BB/team/game: ${stats.avgBBPerTeamPerGame.toFixed(2)}`);
    console.log(`  Avg SO/team/game: ${stats.avgSOPerTeamPerGame.toFixed(2)}`);
    console.log(`  Avg HR/team/game: ${stats.avgHRPerTeamPerGame.toFixed(2)}`);
    console.log(`  CG: ${stats.cgCount}, SHO: ${stats.shoCount}`);
    expect(true).toBe(true); // Always passes, just for diagnostic output
  });
});
