/**
 * Realism Check: Batting Average Range Test
 *
 * Simulates 500+ plate appearances for a .270 hitter card against
 * a grade-8 pitcher to verify BA falls in a realistic range [.220, .320].
 *
 * This test validates the full pipeline: card generation -> PA resolution -> stats.
 */

import { SeededRNG } from '@lib/rng/seeded-rng';
import { resolvePlateAppearance } from '@lib/simulation/plate-appearance';
import { computeSlotAllocation, fillVariablePositions } from '@lib/card-generator/value-mapper';
import { applyStructuralConstants, CARD_LENGTH } from '@lib/card-generator/structural';
import { OutcomeCategory } from '@lib/types/game';
import type { PlayerRates } from '@lib/card-generator/rate-calculator';
import type { CardValue } from '@lib/types/player';

/** Build a card for a typical .270 hitter (Lahman-like rates). */
function build270HitterCard(): CardValue[] {
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

  const card: CardValue[] = new Array(CARD_LENGTH).fill(0);
  applyStructuralConstants(card);
  const alloc = computeSlotAllocation(rates);
  fillVariablePositions(card, alloc, 0.295);
  return card;
}

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

/** Outcomes that are not plate appearances (batter redraws in game runner). */
const NO_PA_OUTCOMES = new Set([
  OutcomeCategory.STOLEN_BASE_OPP,
  OutcomeCategory.WILD_PITCH,
  OutcomeCategory.BALK,
  OutcomeCategory.PASSED_BALL,
  OutcomeCategory.SPECIAL_EVENT,
]);

describe('Realism Check: Batting Average Simulation', () => {
  it('produces batting average in [.220, .320] for a .270 hitter vs grade 8 pitcher', () => {
    const card = build270HitterCard();
    const pitcherGrade = 8;
    const rng = new SeededRNG(42);
    const draws = 800; // Draw more to get ~600 real PAs after non-PA skips

    let hits = 0;
    let atBats = 0;
    let walks = 0;

    for (let i = 0; i < draws; i++) {
      const result = resolvePlateAppearance(card, pitcherGrade, rng);

      // Skip non-PA events (batter redraws in the game runner)
      if (NO_PA_OUTCOMES.has(result.outcome)) continue;

      if (WALK_OUTCOMES.has(result.outcome)) {
        walks++;
        continue;
      }

      atBats++;
      if (HIT_OUTCOMES.has(result.outcome)) {
        hits++;
      }
    }

    const ba = atBats > 0 ? hits / atBats : 0;

    // Batting average should be realistic: .220 to .320
    // IDT table scrambles outcomes; scale factors compensate
    expect(ba).toBeGreaterThanOrEqual(0.220);
    expect(ba).toBeLessThanOrEqual(0.320);
  });

  it('produces walk rate in [.03, .20] for a .09 walk-rate hitter', () => {
    const card = build270HitterCard();
    const pitcherGrade = 8;
    const rng = new SeededRNG(99);
    const draws = 800;

    let walks = 0;
    let realPAs = 0;

    for (let i = 0; i < draws; i++) {
      const result = resolvePlateAppearance(card, pitcherGrade, rng);
      if (NO_PA_OUTCOMES.has(result.outcome)) continue;
      realPAs++;
      if (WALK_OUTCOMES.has(result.outcome)) {
        walks++;
      }
    }

    const walkRate = realPAs > 0 ? walks / realPAs : 0;
    // Wider range: IDT table scrambles walk positions to other outcomes
    // but also scrambles OTHER positions to walks
    expect(walkRate).toBeGreaterThanOrEqual(0.03);
    expect(walkRate).toBeLessThanOrEqual(0.20);
  });

  it('produces strikeout rate in [.05, .30] for a .17 K-rate hitter', () => {
    const card = build270HitterCard();
    const pitcherGrade = 8;
    const rng = new SeededRNG(777);
    const draws = 800;

    let strikeouts = 0;
    let realPAs = 0;

    for (let i = 0; i < draws; i++) {
      const result = resolvePlateAppearance(card, pitcherGrade, rng);
      if (NO_PA_OUTCOMES.has(result.outcome)) continue;
      realPAs++;
      if (STRIKEOUT_OUTCOMES.has(result.outcome)) {
        strikeouts++;
      }
    }

    const kRate = realPAs > 0 ? strikeouts / realPAs : 0;
    // Wider range: IDT table scrambles strikeout positions to other outcomes
    // but also scrambles OTHER positions to strikeouts
    expect(kRate).toBeGreaterThanOrEqual(0.05);
    expect(kRate).toBeLessThanOrEqual(0.30);
  });

  it('elite .350+ hitter produces BA below .400 vs grade 8 pitcher', () => {
    // Build a card for a .350+ hitter (e.g., Shoeless Joe Jackson)
    const rates: PlayerRates = {
      PA: 600,
      walkRate: 0.06,
      strikeoutRate: 0.08,
      homeRunRate: 0.02,
      singleRate: 0.22,
      doubleRate: 0.06,
      tripleRate: 0.02,
      sbRate: 0.50,
      iso: 0.120,
      hbpRate: 0.005,
      sfRate: 0.005,
      shRate: 0,
      gdpRate: 0.01,
    };

    const card: CardValue[] = new Array(CARD_LENGTH).fill(0);
    applyStructuralConstants(card);
    const alloc = computeSlotAllocation(rates);
    fillVariablePositions(card, alloc, 0.340);

    const pitcherGrade = 8;
    const rng = new SeededRNG(42);
    const draws = 800;

    let hits = 0;
    let atBats = 0;

    for (let i = 0; i < draws; i++) {
      const result = resolvePlateAppearance(card, pitcherGrade, rng);

      if (NO_PA_OUTCOMES.has(result.outcome)) continue;

      if (WALK_OUTCOMES.has(result.outcome)) {
        continue;
      }

      atBats++;
      if (HIT_OUTCOMES.has(result.outcome)) {
        hits++;
      }
    }

    const ba = atBats > 0 ? hits / atBats : 0;

    // With IDT table + pitcher grade suppression, even elite hitters stay below .400
    expect(ba).toBeLessThan(0.400);
    // But they should still hit well
    expect(ba).toBeGreaterThan(0.200);
  });

  it('higher pitcher grade suppresses hits more than lower grade', () => {
    const card = build270HitterCard();
    const draws = 500;
    const seeds = 20;

    // Aggregate across many seeds to overcome IDT table variance.
    // The IDT table's random row selection consumes different RNG state
    // per pitcher grade, so a single seed comparison is unreliable.
    let totalHitsVsAce = 0;
    let totalAbsVsAce = 0;
    let totalHitsVsJourneyMan = 0;
    let totalAbsVsJourneyMan = 0;

    for (let s = 0; s < seeds; s++) {
      const rng1 = new SeededRNG(s * 1000 + 1);
      const rng2 = new SeededRNG(s * 1000 + 2);

      for (let i = 0; i < draws; i++) {
        const result = resolvePlateAppearance(card, 14, rng1);
        if (NO_PA_OUTCOMES.has(result.outcome)) continue;
        if (!WALK_OUTCOMES.has(result.outcome)) {
          totalAbsVsAce++;
          if (HIT_OUTCOMES.has(result.outcome)) totalHitsVsAce++;
        }
      }

      for (let i = 0; i < draws; i++) {
        const result = resolvePlateAppearance(card, 3, rng2);
        if (NO_PA_OUTCOMES.has(result.outcome)) continue;
        if (!WALK_OUTCOMES.has(result.outcome)) {
          totalAbsVsJourneyMan++;
          if (HIT_OUTCOMES.has(result.outcome)) totalHitsVsJourneyMan++;
        }
      }
    }

    const baVsAce = totalAbsVsAce > 0 ? totalHitsVsAce / totalAbsVsAce : 0;
    const baVsJourneyMan = totalAbsVsJourneyMan > 0 ? totalHitsVsJourneyMan / totalAbsVsJourneyMan : 0;

    // Ace (grade 14) should suppress hits more than journeyman (grade 3)
    expect(baVsAce).toBeLessThan(baVsJourneyMan);
  });

  it('IDT table produces variety of outcome types', () => {
    const card = build270HitterCard();
    const pitcherGrade = 8;
    const rng = new SeededRNG(42);
    const draws = 600;
    const outcomeTypes = new Set<OutcomeCategory>();

    for (let i = 0; i < draws; i++) {
      const result = resolvePlateAppearance(card, pitcherGrade, rng);
      outcomeTypes.add(result.outcome);
    }

    // IDT table should scramble card values into many different outcomes.
    // With direct mapping only, a card full of singles/walks/Ks would produce
    // at most 3-4 outcome types. IDT should produce at least 8 distinct types.
    expect(outcomeTypes.size).toBeGreaterThanOrEqual(8);
  });
});

/**
 * Real APBA Card Validation Tests
 *
 * Uses actual player cards from PLAYERS.DAT (1971 season) to validate
 * the IDT.OBJ outcome table produces realistic statistics.
 * This is the definitive test: if real APBA cards produce realistic
 * stats through our system, the simulation is faithful to BBW.
 */
describe('Real APBA Card Validation', () => {
  /**
   * Don Buford - 1971 Baltimore Orioles
   * Real stats: .290 BA, 19 HR, 62 BB, 89 SO in 449 AB / ~510 PA
   * Card from PLAYERS.DAT (35 bytes):
   */
  const BUFORD_CARD: CardValue[] = [
    14,30,11,28,30,7,27,13,8,29,9,26,6,31,14,33,28,14,29,8,14,13,9,25,16,32,8,13,40,22,31,14,35,1,0
  ];

  /**
   * Frank Robinson - 1971 Baltimore Orioles
   * Real stats: .281 BA, 28 HR, 62 BB, 72 SO
   */
  const FRANK_ROBINSON_CARD: CardValue[] = [
    14,30,8,28,13,7,27,13,8,24,9,26,5,31,42,14,24,14,29,7,14,24,9,25,20,32,8,34,24,13,30,37,35,1,0
  ];

  /**
   * Mark Belanger - 1971 Baltimore Orioles
   * Real stats: .266 BA, 0 HR, 48 BB, 73 SO (no power, good defense)
   */
  const BELANGER_CARD: CardValue[] = [
    14,30,8,28,30,7,27,13,8,32,9,26,7,31,39,14,24,14,29,8,14,13,9,25,20,32,8,34,23,26,31,22,35,0,2
  ];

  /**
   * Mike Cuellar - Pitcher (L 14) batting
   * Real stats: .103 BA - pitchers can barely hit
   * Card flooded with value 13 (walk outcome)
   */
  const CUELLAR_CARD: CardValue[] = [
    13,30,23,13,13,9,27,13,36,13,13,26,8,31,13,13,24,13,29,9,14,13,13,25,13,32,21,34,13,13,13,13,35,0,1
  ];

  function simulateCard(card: CardValue[], pitcherGrade: number, seeds: number, drawsPerSeed: number) {
    let totalHits = 0;
    let totalABs = 0;
    let totalWalks = 0;
    let totalKs = 0;
    let totalHRs = 0;
    let totalNonPA = 0;
    let totalDraws = 0;

    for (let s = 0; s < seeds; s++) {
      const rng = new SeededRNG(s * 7919 + 42); // Different prime for each seed
      for (let i = 0; i < drawsPerSeed; i++) {
        totalDraws++;
        const result = resolvePlateAppearance(card, pitcherGrade, rng);

        if (NO_PA_OUTCOMES.has(result.outcome)) {
          totalNonPA++;
          continue;
        }

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

    const realPAs = totalDraws - totalNonPA;
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
      totalNonPA,
      totalDraws,
      realPAs,
    };
  }

  it('Don Buford (.290 BA) card produces realistic batting average', () => {
    const stats = simulateCard(BUFORD_CARD, 8, 20, 500);

    // Buford hit .290 in real life; with IDT scrambling, expect [.200, .380]
    expect(stats.ba).toBeGreaterThanOrEqual(0.200);
    expect(stats.ba).toBeLessThanOrEqual(0.380);
  });

  it('Frank Robinson (.281 BA, 28 HR) card produces more HRs than Belanger (0 HR)', () => {
    const robinsonStats = simulateCard(FRANK_ROBINSON_CARD, 8, 20, 500);
    const belangerStats = simulateCard(BELANGER_CARD, 8, 20, 500);

    // Robinson (28 HR) should produce more HRs than Belanger (0 HR)
    expect(robinsonStats.totalHRs).toBeGreaterThan(belangerStats.totalHRs);
  });

  it('pitcher card (Cuellar .103 BA) walks much more than position player', () => {
    const cuellarStats = simulateCard(CUELLAR_CARD, 8, 20, 500);
    const bufordStats = simulateCard(BUFORD_CARD, 8, 20, 500);

    // Pitcher card is flooded with value 13 (walk). When batter wins the grade
    // check, these produce walks via direct mapping. When pitcher wins, IDT
    // scrambles them to various outcomes (including some hits). The walk rate
    // is the primary differentiator for pitcher cards.
    expect(cuellarStats.walkRate).toBeGreaterThan(bufordStats.walkRate);
    // Cuellar should have very high walk rate (15+ walk positions on card)
    expect(cuellarStats.walkRate).toBeGreaterThan(0.20);
  });

  it('Belanger (0 HR) card produces very few home runs', () => {
    const stats = simulateCard(BELANGER_CARD, 8, 20, 500);

    // Belanger had 0 HR in real life. His card has no HR-correlated values.
    // Through IDT, a few HRs might still appear, but the rate should be low.
    expect(stats.hrRate).toBeLessThan(0.05); // Less than 5% HR rate
  });

  it('real cards produce distinct outcome categories (IDT table working)', () => {
    const rng = new SeededRNG(42);
    const draws = 600;
    const outcomeTypes = new Set<OutcomeCategory>();

    for (let i = 0; i < draws; i++) {
      const result = resolvePlateAppearance(BUFORD_CARD, 8, rng);
      outcomeTypes.add(result.outcome);
    }

    // Real APBA card through IDT should produce many distinct outcome types
    expect(outcomeTypes.size).toBeGreaterThanOrEqual(8);
  });

  it('higher pitcher grade suppresses more hits on real card', () => {
    const aceStats = simulateCard(BUFORD_CARD, 14, 30, 500);
    const journeymanStats = simulateCard(BUFORD_CARD, 3, 30, 500);

    // Grade 14 ace should suppress more hits than grade 3 journeyman
    expect(aceStats.ba).toBeLessThan(journeymanStats.ba);
  });
});
