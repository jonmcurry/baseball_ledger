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
