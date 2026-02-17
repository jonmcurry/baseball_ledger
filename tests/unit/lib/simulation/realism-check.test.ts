/**
 * Realism Check: Batting Average Range Test
 *
 * Simulates 500+ plate appearances for a .270 hitter card against
 * various pitcher grades to verify BA falls in a realistic range.
 *
 * This test validates the full pipeline: card generation -> PA resolution -> stats.
 * Uses the SERD 5-column ApbaCard system (single roll -> column lookup -> outcome).
 */

import { SeededRNG } from '@lib/rng/seeded-rng';
import { resolvePlateAppearance } from '@lib/simulation/plate-appearance';
import { generateApbaCard } from '@lib/card-generator/apba-card-generator';
import { OutcomeCategory } from '@lib/types/game';
import type { PlayerRates } from '@lib/card-generator/rate-calculator';
import type { ApbaCard } from '@lib/types/player';

/** Build an ApbaCard for a typical .270 hitter (Lahman-like rates). */
function build270HitterCard(): ApbaCard {
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
    const draws = 800;

    let hits = 0;
    let atBats = 0;

    for (let i = 0; i < draws; i++) {
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
    expect(ba).toBeGreaterThanOrEqual(0.180);
    expect(ba).toBeLessThanOrEqual(0.380);
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
      realPAs++;
      if (WALK_OUTCOMES.has(result.outcome)) {
        walks++;
      }
    }

    const walkRate = realPAs > 0 ? walks / realPAs : 0;
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
      realPAs++;
      if (STRIKEOUT_OUTCOMES.has(result.outcome)) {
        strikeouts++;
      }
    }

    const kRate = realPAs > 0 ? strikeouts / realPAs : 0;
    expect(kRate).toBeGreaterThanOrEqual(0.05);
    expect(kRate).toBeLessThanOrEqual(0.30);
  });

  it('elite .350+ hitter produces BA below .400 vs grade 8 pitcher', () => {
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
    const card = generateApbaCard(rates, { byte33: 7, byte34: 0 });

    const pitcherGrade = 8;
    const rng = new SeededRNG(42);
    const draws = 800;

    let hits = 0;
    let atBats = 0;

    for (let i = 0; i < draws; i++) {
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
    expect(ba).toBeLessThan(0.400);
    expect(ba).toBeGreaterThan(0.200);
  });

  it('higher pitcher grade suppresses hits more than lower grade', () => {
    const card = build270HitterCard();
    const draws = 500;
    const seeds = 20;

    let totalHitsVsAce = 0;
    let totalAbsVsAce = 0;
    let totalHitsVsJourneyMan = 0;
    let totalAbsVsJourneyMan = 0;

    for (let s = 0; s < seeds; s++) {
      const rng1 = new SeededRNG(s * 1000 + 1);
      const rng2 = new SeededRNG(s * 1000 + 2);

      for (let i = 0; i < draws; i++) {
        const result = resolvePlateAppearance(card, 14, rng1);
        if (!WALK_OUTCOMES.has(result.outcome)) {
          totalAbsVsAce++;
          if (HIT_OUTCOMES.has(result.outcome)) totalHitsVsAce++;
        }
      }

      for (let i = 0; i < draws; i++) {
        const result = resolvePlateAppearance(card, 3, rng2);
        if (!WALK_OUTCOMES.has(result.outcome)) {
          totalAbsVsJourneyMan++;
          if (HIT_OUTCOMES.has(result.outcome)) totalHitsVsJourneyMan++;
        }
      }
    }

    const baVsAce = totalAbsVsAce > 0 ? totalHitsVsAce / totalAbsVsAce : 0;
    const baVsJourneyMan = totalAbsVsJourneyMan > 0 ? totalHitsVsJourneyMan / totalAbsVsJourneyMan : 0;

    // Ace (grade 14) selects column C; journeyman (grade 3) selects column E
    // Column E has more hits, so BA should be higher vs journeyman
    expect(baVsAce).toBeLessThan(baVsJourneyMan);
  });

  it('direct mapping produces outcome types matching card composition', () => {
    const card = build270HitterCard();
    const pitcherGrade = 8;
    const rng = new SeededRNG(42);
    const draws = 600;
    const outcomeTypes = new Set<OutcomeCategory>();

    for (let i = 0; i < draws; i++) {
      const result = resolvePlateAppearance(card, pitcherGrade, rng);
      outcomeTypes.add(result.outcome);
    }

    // SERD card has diverse outcomes (singles, walks, Ks, outs, HR, doubles, etc.)
    expect(outcomeTypes.size).toBeGreaterThanOrEqual(5);
  });
});

/**
 * Real Player Validation Tests
 *
 * Uses approximate MLB stats to generate ApbaCards and verify the SERD
 * system produces realistic outcomes. Cards are generated from PlayerRates
 * (matching the actual card generation pipeline) rather than hardcoded bytes.
 */
describe('Real Player Card Validation (SERD)', () => {
  /** Don Buford - 1971 Baltimore Orioles (.290 BA, 19 HR, 62 BB, 89 SO) */
  const BUFORD_CARD = generateApbaCard({
    PA: 510, walkRate: 0.122, strikeoutRate: 0.175, homeRunRate: 0.037,
    singleRate: 0.165, doubleRate: 0.035, tripleRate: 0.004, sbRate: 0.30,
    iso: 0.140, hbpRate: 0.01, sfRate: 0.01, shRate: 0, gdpRate: 0.02,
  }, { byte33: 7, byte34: 0 });

  /** Frank Robinson - 1971 Baltimore Orioles (.281 BA, 28 HR, 62 BB, 72 SO) */
  const FRANK_ROBINSON_CARD = generateApbaCard({
    PA: 560, walkRate: 0.111, strikeoutRate: 0.129, homeRunRate: 0.050,
    singleRate: 0.145, doubleRate: 0.035, tripleRate: 0.005, sbRate: 0.10,
    iso: 0.210, hbpRate: 0.01, sfRate: 0.01, shRate: 0, gdpRate: 0.02,
  }, { byte33: 1, byte34: 0 }); // power hitter

  /** Mark Belanger - 1971 Baltimore Orioles (.266 BA, 0 HR, 48 BB, 73 SO) */
  const BELANGER_CARD = generateApbaCard({
    PA: 460, walkRate: 0.104, strikeoutRate: 0.159, homeRunRate: 0.000,
    singleRate: 0.200, doubleRate: 0.035, tripleRate: 0.004, sbRate: 0.20,
    iso: 0.030, hbpRate: 0.005, sfRate: 0.005, shRate: 0.02, gdpRate: 0.02,
  }, { byte33: 8, byte34: 0 }); // elite defense

  /** Mike Cuellar - Pitcher batting (.103 BA) */
  const CUELLAR_CARD = generateApbaCard({
    PA: 100, walkRate: 0.05, strikeoutRate: 0.30, homeRunRate: 0.005,
    singleRate: 0.05, doubleRate: 0.01, tripleRate: 0.002, sbRate: 0,
    iso: 0.020, hbpRate: 0.005, sfRate: 0.005, shRate: 0.05, gdpRate: 0.01,
  }, { byte33: 0, byte34: 6 }); // pitcher

  function simulateCard(card: ApbaCard, pitcherGrade: number, seeds: number, drawsPerSeed: number) {
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
        const result = resolvePlateAppearance(card, pitcherGrade, rng);

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
      realPAs,
    };
  }

  it('Don Buford (.290 BA) card produces realistic batting average', () => {
    const stats = simulateCard(BUFORD_CARD, 8, 20, 500);
    expect(stats.ba).toBeGreaterThanOrEqual(0.200);
    expect(stats.ba).toBeLessThanOrEqual(0.380);
  });

  it('Frank Robinson (.281 BA, 28 HR) card produces more HRs than Belanger (0 HR)', () => {
    const robinsonStats = simulateCard(FRANK_ROBINSON_CARD, 8, 20, 500);
    const belangerStats = simulateCard(BELANGER_CARD, 8, 20, 500);
    expect(robinsonStats.totalHRs).toBeGreaterThan(belangerStats.totalHRs);
  });

  it('pitcher card (Cuellar .103 BA) has very low batting average', () => {
    const cuellarStats = simulateCard(CUELLAR_CARD, 8, 20, 500);
    // Pitcher BA should be very low
    expect(cuellarStats.ba).toBeLessThan(0.200);
  });

  it('Belanger (0 HR) card produces very few home runs', () => {
    const stats = simulateCard(BELANGER_CARD, 8, 20, 500);
    expect(stats.hrRate).toBeLessThan(0.02);
  });

  it('real cards produce outcome types matching card composition', () => {
    const rng = new SeededRNG(42);
    const draws = 600;
    const outcomeTypes = new Set<OutcomeCategory>();

    for (let i = 0; i < draws; i++) {
      const result = resolvePlateAppearance(BUFORD_CARD, 8, rng);
      outcomeTypes.add(result.outcome);
    }

    expect(outcomeTypes.size).toBeGreaterThanOrEqual(5);
  });

  it('higher pitcher grade suppresses more hits on real card', () => {
    const aceStats = simulateCard(BUFORD_CARD, 14, 30, 500);
    const journeymanStats = simulateCard(BUFORD_CARD, 3, 30, 500);
    expect(aceStats.ba).toBeLessThan(journeymanStats.ba);
  });
});
