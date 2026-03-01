/**
 * Realism Check: Batting Average Range Test
 *
 * Simulates plate appearances using BBW-authentic resolution to verify
 * that batter cards produce stats in realistic MLB ranges.
 *
 * Uses the BBW grade-check system where only card values 7, 8, 11 are
 * affected by pitcher grade. All other outcomes are direct-mapped.
 */

import { SeededRNG } from '@lib/rng/seeded-rng';
import { resolvePlateAppearance } from '@lib/simulation/plate-appearance';
import { OutcomeCategory } from '@lib/types/game';
import type { CardValue } from '@lib/types/player';
import { CARD_LENGTH } from '@lib/card-generator/structural';

const HIT_OUTCOMES = new Set([
  OutcomeCategory.SINGLE_CLEAN,
  OutcomeCategory.SINGLE_ADVANCE,
  OutcomeCategory.DOUBLE,
  OutcomeCategory.TRIPLE,
  OutcomeCategory.HOME_RUN,
  OutcomeCategory.HOME_RUN_VARIANT,
]);

const WALK_OUTCOMES = new Set([
  OutcomeCategory.WALK,
  OutcomeCategory.WALK_INTENTIONAL,
  OutcomeCategory.HIT_BY_PITCH,
]);

const STRIKEOUT_OUTCOMES = new Set([
  OutcomeCategory.STRIKEOUT_LOOKING,
  OutcomeCategory.STRIKEOUT_SWINGING,
]);

/**
 * Build a 35-byte card for a .270 hitter.
 * 6 grade-check singles, 2 doubles, 1 HR, 3 walks, 5 Ks, rest outs.
 */
function build270HitterCard(): CardValue[] {
  return [
    13,  // pos 0: walk
    30,  // pos 1: structural
    7,   // pos 2: single (grade check)
    28,  // pos 3: structural
    7,   // pos 4: single (grade check)
    0,   // pos 5: double
    27,  // pos 6: structural
    7,   // pos 7: single (grade check)
    14,  // pos 8: strikeout
    7,   // pos 9: single (grade check)
    26,  // pos 10: ground out
    26,  // pos 11: structural
    14,  // pos 12: strikeout
    31,  // pos 13: structural
    1,   // pos 14: home run
    14,  // pos 15: strikeout
    26,  // pos 16: ground out
    8,   // pos 17: single (grade check)
    29,  // pos 18: structural
    0,   // pos 19: double
    14,  // pos 20: strikeout
    26,  // pos 21: ground out
    13,  // pos 22: walk
    25,  // pos 23: structural
    17,  // pos 24: power (IDT range)
    32,  // pos 25: structural
    26,  // pos 26: ground out
    13,  // pos 27: walk
    26,  // pos 28: ground out
    26,  // pos 29: ground out
    26,  // pos 30: ground out
    14,  // pos 31: strikeout
    35,  // pos 32: structural
    7,   // pos 33: archetype -> single (grade check)
    0,   // pos 34: archetype -> double
  ];
}

/** Standard pitcher batting card (mostly Ks and outs). */
function makePitcherCard(): CardValue[] {
  const card = new Array(CARD_LENGTH).fill(14); // mostly strikeouts
  // Structural constants
  card[1] = 30; card[3] = 28; card[6] = 27; card[11] = 26;
  card[13] = 31; card[18] = 29; card[23] = 25; card[25] = 32; card[32] = 35;
  // Some ground outs and walks
  card[5] = 26; card[8] = 26; card[10] = 26; card[16] = 26;
  card[19] = 26; card[21] = 26; card[22] = 13; card[24] = 13;
  card[33] = 0; card[34] = 6;
  return card;
}

/** Simulate PAs and collect stats. */
function simulateCard(
  batterCard: CardValue[],
  pitcherCard: CardValue[],
  pitcherGrade: number,
  seeds: number,
  drawsPerSeed: number,
) {
  let totalHits = 0;
  let totalABs = 0;
  let totalWalks = 0;
  let totalKs = 0;
  let totalHRs = 0;
  let totalDraws = 0;

  for (let s = 0; s < seeds; s++) {
    const rng = new SeededRNG(s * 7919 + 42);
    for (let i = 0; i < drawsPerSeed; i++) {
      totalDraws++;
      const result = resolvePlateAppearance(batterCard, pitcherCard, pitcherGrade, rng);

      if (WALK_OUTCOMES.has(result.outcome)) {
        totalWalks++;
        continue;
      }

      totalABs++;
      if (HIT_OUTCOMES.has(result.outcome)) {
        totalHits++;
        if (result.outcome === OutcomeCategory.HOME_RUN ||
            result.outcome === OutcomeCategory.HOME_RUN_VARIANT) {
          totalHRs++;
        }
      }
      if (STRIKEOUT_OUTCOMES.has(result.outcome)) {
        totalKs++;
      }
    }
  }

  const realPAs = totalDraws;
  return {
    ba: totalABs > 0 ? totalHits / totalABs : 0,
    hrRate: realPAs > 0 ? totalHRs / realPAs : 0,
    walkRate: realPAs > 0 ? totalWalks / realPAs : 0,
    kRate: realPAs > 0 ? totalKs / realPAs : 0,
    totalHits,
    totalABs,
    totalWalks,
    totalKs,
    totalHRs,
    totalDraws,
  };
}

describe('Realism Check: BBW Batting Average Simulation', () => {
  const pitcherCard = makePitcherCard();

  it('produces batting average in [.180, .380] for a .270 hitter vs grade 8 pitcher', () => {
    const card = build270HitterCard();
    const stats = simulateCard(card, pitcherCard, 8, 20, 800);

    expect(stats.ba).toBeGreaterThanOrEqual(0.180);
    expect(stats.ba).toBeLessThanOrEqual(0.380);
  });

  it('produces walk rate in [.03, .20] for a .09 walk-rate hitter', () => {
    const card = build270HitterCard();
    const stats = simulateCard(card, pitcherCard, 8, 20, 800);

    expect(stats.walkRate).toBeGreaterThanOrEqual(0.03);
    expect(stats.walkRate).toBeLessThanOrEqual(0.20);
  });

  it('produces strikeout rate in [.05, .35] for a .17 K-rate hitter', () => {
    const card = build270HitterCard();
    const stats = simulateCard(card, pitcherCard, 8, 20, 800);

    expect(stats.kRate).toBeGreaterThanOrEqual(0.05);
    expect(stats.kRate).toBeLessThanOrEqual(0.35);
  });

  it('higher pitcher grade suppresses more hits', () => {
    const card = build270HitterCard();
    const statsVsAce = simulateCard(card, pitcherCard, 20, 30, 500);
    const statsVsJourneyman = simulateCard(card, pitcherCard, 5, 30, 500);

    // Higher grade suppresses more grade-check values (7, 8, 11)
    expect(statsVsAce.ba).toBeLessThan(statsVsJourneyman.ba);
  });

  it('direct-mapped outcomes produce diverse outcome types', () => {
    const card = build270HitterCard();
    const rng = new SeededRNG(42);
    const outcomeTypes = new Set<OutcomeCategory>();

    for (let i = 0; i < 600; i++) {
      const result = resolvePlateAppearance(card, pitcherCard, 8, rng);
      outcomeTypes.add(result.outcome);
    }

    // Card should produce at least 5 different outcome types
    expect(outcomeTypes.size).toBeGreaterThanOrEqual(5);
  });
});

describe('Real Player Card Validation (BBW)', () => {
  const pitcherCard = makePitcherCard();

  /** Don Buford-style card (.290 BA, contact hitter with speed) */
  const BUFORD_CARD: CardValue[] = [
    13, 30, 7, 28, 7, 0, 27, 7, 14, 7,
    26, 26, 14, 31, 1, 14, 26, 8, 29, 0,
    14, 26, 13, 25, 17, 32, 26, 13, 7, 26,
    26, 14, 35, 7, 0,
  ];

  /** Frank Robinson-style card (.281 BA, 28 HR, power hitter) */
  const FRANK_ROBINSON_CARD: CardValue[] = [
    13, 30, 7, 28, 7, 1, 27, 7, 14, 7,
    0, 26, 14, 31, 1, 14, 26, 8, 29, 0,
    14, 26, 13, 25, 19, 32, 26, 13, 26, 26,
    26, 14, 35, 1, 0,
  ];

  /** Belanger-style card (.266 BA, 0 HR, elite defense) */
  const BELANGER_CARD: CardValue[] = [
    13, 30, 7, 28, 7, 26, 27, 7, 14, 7,
    26, 26, 14, 31, 26, 14, 26, 8, 29, 26,
    14, 26, 13, 25, 13, 32, 26, 13, 7, 26,
    26, 14, 35, 8, 0,
  ];

  /** Cuellar-style pitcher batting card (.103 BA) */
  const CUELLAR_CARD: CardValue[] = [
    14, 30, 14, 28, 14, 26, 27, 14, 26, 14,
    26, 26, 13, 31, 26, 14, 26, 14, 29, 26,
    14, 26, 26, 25, 13, 32, 26, 14, 26, 26,
    26, 14, 35, 0, 6,
  ];

  it('Don Buford card produces realistic batting average', () => {
    const stats = simulateCard(BUFORD_CARD, pitcherCard, 8, 20, 500);
    expect(stats.ba).toBeGreaterThanOrEqual(0.180);
    expect(stats.ba).toBeLessThanOrEqual(0.400);
  });

  it('Frank Robinson card produces more HRs than Belanger (0 HR)', () => {
    const robinsonStats = simulateCard(FRANK_ROBINSON_CARD, pitcherCard, 8, 20, 500);
    const belangerStats = simulateCard(BELANGER_CARD, pitcherCard, 8, 20, 500);
    expect(robinsonStats.totalHRs).toBeGreaterThan(belangerStats.totalHRs);
  });

  it('pitcher card (Cuellar .103 BA) has very low batting average', () => {
    const cuellarStats = simulateCard(CUELLAR_CARD, pitcherCard, 8, 20, 500);
    expect(cuellarStats.ba).toBeLessThan(0.200);
  });

  it('Belanger (0 HR) card produces very few home runs', () => {
    const stats = simulateCard(BELANGER_CARD, pitcherCard, 8, 20, 500);
    expect(stats.hrRate).toBeLessThan(0.02);
  });

  it('real cards produce diverse outcome types', () => {
    const rng = new SeededRNG(42);
    const outcomeTypes = new Set<OutcomeCategory>();

    for (let i = 0; i < 600; i++) {
      const result = resolvePlateAppearance(BUFORD_CARD, pitcherCard, 8, rng);
      outcomeTypes.add(result.outcome);
    }

    expect(outcomeTypes.size).toBeGreaterThanOrEqual(5);
  });

  it('higher pitcher grade suppresses more hits on real card', () => {
    const aceStats = simulateCard(BUFORD_CARD, pitcherCard, 20, 30, 500);
    const journeymanStats = simulateCard(BUFORD_CARD, pitcherCard, 5, 30, 500);
    expect(aceStats.ba).toBeLessThan(journeymanStats.ba);
  });
});
