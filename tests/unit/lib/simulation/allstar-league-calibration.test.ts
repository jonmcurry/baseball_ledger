/**
 * All-Star League Calibration Tests
 *
 * Validates that the SERD 5-column system produces realistic batting
 * averages when pitcher quality is uniformly high (grade 13-17),
 * as occurs in all-star/fantasy draft leagues.
 *
 * Previously, all elite pitchers mapped to Column B (0.72x singles),
 * depressing BA by ~25%. With widened Column C (grade 7-14) and
 * symmetric multipliers, a .300 hitter should produce ~.260-.320 BA
 * against an all-star pitching staff.
 */

import { SeededRNG } from '@lib/rng/seeded-rng';
import { resolvePlateAppearance } from '@lib/simulation/plate-appearance';
import { generateApbaCard, gradeToColumn } from '@lib/card-generator/apba-card-generator';
import { OutcomeCategory } from '@lib/types/game';
import type { PlayerRates } from '@lib/card-generator/rate-calculator';
import type { ApbaCard } from '@lib/types/player';

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

/** Build a card for a .300 all-star hitter (Ruth/Williams tier). */
function buildEliteHitterCard(): ApbaCard {
  const rates: PlayerRates = {
    PA: 600,
    walkRate: 0.15,
    strikeoutRate: 0.10,
    homeRunRate: 0.06,
    singleRate: 0.18,
    doubleRate: 0.05,
    tripleRate: 0.005,
    sbRate: 0.10,
    iso: 0.250,
    hbpRate: 0.01,
    sfRate: 0.01,
    shRate: 0,
    gdpRate: 0.01,
  };
  return generateApbaCard(rates, { byte33: 1, byte34: 0 });
}

/** Build a card for a .270 solid all-star hitter. */
function buildSolidHitterCard(): ApbaCard {
  const rates: PlayerRates = {
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
  return generateApbaCard(rates, { byte33: 7, byte34: 0 });
}

/** Simulate many PAs against a mix of pitcher grades. */
function simulateAllStarLeague(
  card: ApbaCard,
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
      const result = resolvePlateAppearance(card, grade, rng);

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

describe('All-Star League Calibration', () => {
  // Typical all-star draft pitcher grade distribution:
  // ~30% grade 13-14, ~40% grade 15-16, ~20% grade 17-18, ~10% grade 19-22
  const ALL_STAR_GRADES = [
    13, 13, 13, 14, 14, 14,       // 30% grade 13-14
    15, 15, 15, 15, 16, 16, 16, 16, // 40% grade 15-16
    17, 17, 18, 18,                // 20% grade 17-18
    19, 22,                        // 10% grade 19-22
  ];

  it('elite .300 hitter produces BA in [.250, .330] against all-star pitching', () => {
    const card = buildEliteHitterCard();
    const stats = simulateAllStarLeague(card, ALL_STAR_GRADES, 30, 500);

    expect(stats.ba).toBeGreaterThanOrEqual(0.250);
    expect(stats.ba).toBeLessThanOrEqual(0.330);
  });

  it('solid .270 hitter produces BA in [.220, .300] against all-star pitching', () => {
    const card = buildSolidHitterCard();
    const stats = simulateAllStarLeague(card, ALL_STAR_GRADES, 30, 500);

    // With ~60% of PAs against Column B/A, some suppression is expected.
    // A .270 hitter should still produce BA above .220.
    expect(stats.ba).toBeGreaterThanOrEqual(0.220);
    expect(stats.ba).toBeLessThanOrEqual(0.300);
  });

  it('grade 17 pitcher suppresses more than grade 14 pitcher', () => {
    const card = buildSolidHitterCard();
    const statsVs14 = simulateAllStarLeague(card, [14], 30, 500);
    const statsVs17 = simulateAllStarLeague(card, [17], 30, 500);

    // Grade 17 (Column B) should suppress more than grade 14 (Column C)
    expect(statsVs17.ba).toBeLessThan(statsVs14.ba);
  });

  it('grade 14 (Column C) produces BA close to base rate', () => {
    const card = buildSolidHitterCard();
    const stats = simulateAllStarLeague(card, [14], 30, 500);

    // Column C is neutral -- BA should be close to .270 base rate
    expect(stats.ba).toBeGreaterThanOrEqual(0.240);
    expect(stats.ba).toBeLessThanOrEqual(0.310);
  });

  it('grade 14 maps to Column C (not B)', () => {
    expect(gradeToColumn(14)).toBe('C');
  });

  it('grade 15 maps to Column B', () => {
    expect(gradeToColumn(15)).toBe('B');
  });

  it('reports diagnostic stats for all-star league', () => {
    const eliteCard = buildEliteHitterCard();
    const solidCard = buildSolidHitterCard();
    const eliteStats = simulateAllStarLeague(eliteCard, ALL_STAR_GRADES, 30, 500);
    const solidStats = simulateAllStarLeague(solidCard, ALL_STAR_GRADES, 30, 500);

    console.log('[All-Star League Calibration Report]');
    console.log(`  Elite .300 hitter vs all-star pitching: BA=${eliteStats.ba.toFixed(3)}, BB%=${(eliteStats.walkRate * 100).toFixed(1)}%`);
    console.log(`  Solid .270 hitter vs all-star pitching: BA=${solidStats.ba.toFixed(3)}, BB%=${(solidStats.walkRate * 100).toFixed(1)}%`);
    console.log(`  Grade distribution: ${ALL_STAR_GRADES.join(', ')}`);
    expect(true).toBe(true);
  });
});
