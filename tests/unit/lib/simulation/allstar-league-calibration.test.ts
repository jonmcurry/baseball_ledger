/**
 * All-Star League Calibration Tests
 *
 * Validates that the BBW grade-check system produces realistic batting
 * averages when pitcher quality is uniformly high (grade 13-17),
 * as occurs in all-star/fantasy draft leagues.
 *
 * In BBW, only card values 7, 8, 11 trigger the grade check. Higher grades
 * suppress more of those hits. Non-grade-check values (HR, walk, K, double)
 * are not affected by pitcher grade.
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

/**
 * Build a 35-byte batter card for a .300 all-star hitter.
 * 7 grade-check singles, 3 doubles, 1 HR, 3 walks, 4 Ks, rest outs.
 */
function buildEliteHitterCard(): CardValue[] {
  return [
    13,  // pos 0: walk
    30,  // pos 1: structural
    7,   // pos 2: single (grade check)
    28,  // pos 3: structural
    7,   // pos 4: single (grade check)
    0,   // pos 5: double
    27,  // pos 6: structural
    7,   // pos 7: single (grade check)
    1,   // pos 8: home run
    7,   // pos 9: single (grade check)
    0,   // pos 10: double
    26,  // pos 11: structural
    14,  // pos 12: strikeout
    31,  // pos 13: structural
    1,   // pos 14: home run
    14,  // pos 15: strikeout
    7,   // pos 16: single (grade check)
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
    7,   // pos 28: single (grade check)
    26,  // pos 29: ground out
    26,  // pos 30: ground out
    14,  // pos 31: strikeout
    35,  // pos 32: structural
    7,   // pos 33: archetype -> single (grade check)
    0,   // pos 34: archetype -> double
  ];
}

/**
 * Build a 35-byte batter card for a .270 solid hitter.
 * 6 grade-check singles, 2 doubles, 1 HR, 3 walks, 5 Ks, rest outs.
 */
function buildSolidHitterCard(): CardValue[] {
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
  // Some ground outs and walks mixed in
  card[5] = 26; card[8] = 26; card[10] = 26; card[16] = 26;
  card[19] = 26; card[21] = 26; card[22] = 13; card[24] = 13;
  card[33] = 0; card[34] = 6;
  return card;
}

/** Simulate many PAs against a mix of pitcher grades. */
function simulateAllStarLeague(
  batterCard: CardValue[],
  pitcherCard: CardValue[],
  pitcherGrades: number[],
  seedCount: number,
  drawsPerSeed: number,
) {
  let totalHits = 0;
  let totalABs = 0;
  let totalWalks = 0;

  for (let s = 0; s < seedCount; s++) {
    const rng = new SeededRNG(s * 7919 + 42);
    for (let i = 0; i < drawsPerSeed; i++) {
      const grade = pitcherGrades[i % pitcherGrades.length];
      const result = resolvePlateAppearance(batterCard, pitcherCard, grade, rng);

      if (WALK_OUTCOMES.has(result.outcome)) {
        totalWalks++;
        continue;
      }

      totalABs++;
      if (HIT_OUTCOMES.has(result.outcome)) {
        totalHits++;
      }
    }
  }

  return {
    ba: totalABs > 0 ? totalHits / totalABs : 0,
    walkRate: (totalABs + totalWalks) > 0 ? totalWalks / (totalABs + totalWalks) : 0,
    totalHits,
    totalABs,
    totalWalks,
  };
}

describe('All-Star League Calibration (BBW Grade Check)', () => {
  const pitcherCard = makePitcherCard();

  // Typical all-star draft pitcher grade distribution
  const ALL_STAR_GRADES = [
    13, 13, 13, 14, 14, 14,
    15, 15, 15, 15, 16, 16, 16, 16,
    17, 17, 18, 18,
    19, 22,
  ];

  it('elite .300 hitter produces BA in [.200, .380] against all-star pitching', () => {
    const card = buildEliteHitterCard();
    const stats = simulateAllStarLeague(card, pitcherCard, ALL_STAR_GRADES, 30, 500);

    expect(stats.ba).toBeGreaterThanOrEqual(0.200);
    expect(stats.ba).toBeLessThanOrEqual(0.380);
  });

  it('solid .270 hitter produces BA in [.180, .340] against all-star pitching', () => {
    const card = buildSolidHitterCard();
    const stats = simulateAllStarLeague(card, pitcherCard, ALL_STAR_GRADES, 30, 500);

    expect(stats.ba).toBeGreaterThanOrEqual(0.180);
    expect(stats.ba).toBeLessThanOrEqual(0.340);
  });

  it('grade 17 pitcher suppresses more than grade 8 pitcher', () => {
    const card = buildSolidHitterCard();
    const statsVs8 = simulateAllStarLeague(card, pitcherCard, [8], 30, 500);
    const statsVs17 = simulateAllStarLeague(card, pitcherCard, [17], 30, 500);

    // Grade 17 should suppress more grade-check singles than grade 8
    expect(statsVs17.ba).toBeLessThan(statsVs8.ba);
  });

  it('grade 14 produces lower BA than grade 5', () => {
    const card = buildSolidHitterCard();
    const statsVs14 = simulateAllStarLeague(card, pitcherCard, [14], 30, 500);
    const statsVs5 = simulateAllStarLeague(card, pitcherCard, [5], 30, 500);

    // Grade 14 suppresses 14/36 = 39% of grade-check values
    // Grade 5 suppresses only 5/36 = 14%
    expect(statsVs14.ba).toBeLessThan(statsVs5.ba);
  });

  it('reports diagnostic stats for all-star league', () => {
    const eliteCard = buildEliteHitterCard();
    const solidCard = buildSolidHitterCard();
    const eliteStats = simulateAllStarLeague(eliteCard, pitcherCard, ALL_STAR_GRADES, 30, 500);
    const solidStats = simulateAllStarLeague(solidCard, pitcherCard, ALL_STAR_GRADES, 30, 500);

    console.log('[All-Star League BBW Calibration Report]');
    console.log(`  Elite hitter vs all-star pitching: BA=${eliteStats.ba.toFixed(3)}, BB%=${(eliteStats.walkRate * 100).toFixed(1)}%`);
    console.log(`  Solid hitter vs all-star pitching: BA=${solidStats.ba.toFixed(3)}, BB%=${(solidStats.walkRate * 100).toFixed(1)}%`);
    console.log(`  Grade distribution: ${ALL_STAR_GRADES.join(', ')}`);
    expect(true).toBe(true);
  });
});
