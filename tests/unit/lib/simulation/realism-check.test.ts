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

describe('Realism Check: Batting Average Simulation', () => {
  it('produces batting average in [.220, .320] for a .270 hitter vs grade 8 pitcher', () => {
    const card = build270HitterCard();
    const pitcherGrade = 8;
    const rng = new SeededRNG(42);
    const totalPA = 600;

    let hits = 0;
    let atBats = 0;
    let walks = 0;

    for (let i = 0; i < totalPA; i++) {
      const result = resolvePlateAppearance(card, pitcherGrade, rng);

      if (WALK_OUTCOMES.has(result.outcome)) {
        walks++;
        // Walks don't count as at-bats
        continue;
      }

      atBats++;
      if (HIT_OUTCOMES.has(result.outcome)) {
        hits++;
      }
    }

    const ba = atBats > 0 ? hits / atBats : 0;

    // Batting average should be realistic: .220 to .300
    // Lower bound accounts for seed variance + ~10.7% grade-8 suppression
    expect(ba).toBeGreaterThanOrEqual(0.220);
    expect(ba).toBeLessThanOrEqual(0.300);
  });

  it('produces walk rate in [.05, .15] for a .09 walk-rate hitter', () => {
    const card = build270HitterCard();
    const pitcherGrade = 8;
    const rng = new SeededRNG(99);
    const totalPA = 600;

    let walks = 0;

    for (let i = 0; i < totalPA; i++) {
      const result = resolvePlateAppearance(card, pitcherGrade, rng);
      if (WALK_OUTCOMES.has(result.outcome)) {
        walks++;
      }
    }

    const walkRate = walks / totalPA;
    expect(walkRate).toBeGreaterThanOrEqual(0.05);
    expect(walkRate).toBeLessThanOrEqual(0.15);
  });

  it('produces strikeout rate in [.10, .25] for a .17 K-rate hitter', () => {
    const card = build270HitterCard();
    const pitcherGrade = 8;
    const rng = new SeededRNG(777);
    const totalPA = 600;

    let strikeouts = 0;

    for (let i = 0; i < totalPA; i++) {
      const result = resolvePlateAppearance(card, pitcherGrade, rng);
      if (STRIKEOUT_OUTCOMES.has(result.outcome)) {
        strikeouts++;
      }
    }

    const kRate = strikeouts / totalPA;
    expect(kRate).toBeGreaterThanOrEqual(0.10);
    expect(kRate).toBeLessThanOrEqual(0.25);
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
    const totalPA = 600;

    let hits = 0;
    let atBats = 0;

    for (let i = 0; i < totalPA; i++) {
      const result = resolvePlateAppearance(card, pitcherGrade, rng);

      if (WALK_OUTCOMES.has(result.outcome)) {
        continue;
      }

      atBats++;
      if (HIT_OUTCOMES.has(result.outcome)) {
        hits++;
      }
    }

    const ba = atBats > 0 ? hits / atBats : 0;

    // With proper pitcher grade suppression, even elite hitters should stay below .400
    expect(ba).toBeLessThan(0.400);
    // But they should still hit well
    expect(ba).toBeGreaterThan(0.280);
  });

  it('higher pitcher grade suppresses hits more than lower grade', () => {
    const card = build270HitterCard();
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(12345);
    const totalPA = 500;

    let hitsVsAce = 0;
    let absVsAce = 0;
    for (let i = 0; i < totalPA; i++) {
      const result = resolvePlateAppearance(card, 14, rng1);
      if (!WALK_OUTCOMES.has(result.outcome)) {
        absVsAce++;
        if (HIT_OUTCOMES.has(result.outcome)) hitsVsAce++;
      }
    }

    let hitsVsJourneyMan = 0;
    let absVsJourneyMan = 0;
    for (let i = 0; i < totalPA; i++) {
      const result = resolvePlateAppearance(card, 3, rng2);
      if (!WALK_OUTCOMES.has(result.outcome)) {
        absVsJourneyMan++;
        if (HIT_OUTCOMES.has(result.outcome)) hitsVsJourneyMan++;
      }
    }

    const baVsAce = absVsAce > 0 ? hitsVsAce / absVsAce : 0;
    const baVsJourneyMan = absVsJourneyMan > 0 ? hitsVsJourneyMan / absVsJourneyMan : 0;

    // Ace should suppress hits more (lower BA)
    expect(baVsAce).toBeLessThan(baVsJourneyMan);
  });
});
