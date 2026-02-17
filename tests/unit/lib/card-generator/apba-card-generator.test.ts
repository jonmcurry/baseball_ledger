/**
 * Tests for SERD 5-column APBA card generation.
 *
 * Each card has 5 columns (A-E) with 36 OutcomeCategory outcomes per column.
 * Column C = neutral (matches player's actual MLB rates).
 * Column A = best pitcher (more outs/Ks). Column E = worst (more hits/walks).
 */

import { OutcomeCategory } from '@lib/types/game';
import type { PlayerRates } from '@lib/card-generator/rate-calculator';
import type { PlayerArchetype, ApbaCard, ApbaColumn } from '@lib/types/player';
import {
  generateApbaCard,
  generatePitcherApbaCard,
  gradeToColumn,
  COLUMN_MULTIPLIERS,
} from '@lib/card-generator/apba-card-generator';

// --- Helpers ---

function avgHitterRates(): PlayerRates {
  return {
    PA: 600,
    walkRate: 0.09,
    strikeoutRate: 0.17,
    homeRunRate: 0.035,
    singleRate: 0.175,
    doubleRate: 0.04,
    tripleRate: 0.005,
    sbRate: 0.6,
    iso: 0.150,
    hbpRate: 0.01,
    sfRate: 0.01,
    shRate: 0.005,
    gdpRate: 0.03,
  };
}

function powerHitterRates(): PlayerRates {
  return {
    ...avgHitterRates(),
    homeRunRate: 0.065,
    strikeoutRate: 0.22,
    walkRate: 0.12,
    singleRate: 0.14,
    iso: 0.280,
  };
}

function contactHitterRates(): PlayerRates {
  return {
    ...avgHitterRates(),
    homeRunRate: 0.01,
    strikeoutRate: 0.08,
    walkRate: 0.06,
    singleRate: 0.22,
    iso: 0.050,
  };
}

function defaultArchetype(): PlayerArchetype {
  return { byte33: 7, byte34: 0 };
}

function countOutcomes(column: readonly OutcomeCategory[]): Map<OutcomeCategory, number> {
  const counts = new Map<OutcomeCategory, number>();
  for (const oc of column) {
    counts.set(oc, (counts.get(oc) ?? 0) + 1);
  }
  return counts;
}

function hitCount(column: readonly OutcomeCategory[]): number {
  const hits = new Set([
    OutcomeCategory.SINGLE_CLEAN,
    OutcomeCategory.SINGLE_ADVANCE,
    OutcomeCategory.DOUBLE,
    OutcomeCategory.TRIPLE,
    OutcomeCategory.HOME_RUN,
    OutcomeCategory.HOME_RUN_VARIANT,
  ]);
  return column.filter((oc) => hits.has(oc)).length;
}

function strikeoutCount(column: readonly OutcomeCategory[]): number {
  return column.filter(
    (oc) => oc === OutcomeCategory.STRIKEOUT_LOOKING || oc === OutcomeCategory.STRIKEOUT_SWINGING,
  ).length;
}

function walkCount(column: readonly OutcomeCategory[]): number {
  return column.filter(
    (oc) => oc === OutcomeCategory.WALK || oc === OutcomeCategory.HIT_BY_PITCH,
  ).length;
}

function hrCount(column: readonly OutcomeCategory[]): number {
  return column.filter(
    (oc) => oc === OutcomeCategory.HOME_RUN || oc === OutcomeCategory.HOME_RUN_VARIANT,
  ).length;
}

// --- Tests ---

describe('APBA Card Generator', () => {
  describe('gradeToColumn()', () => {
    it('maps grade 1-3 to column E (terrible)', () => {
      for (let g = 1; g <= 3; g++) {
        expect(gradeToColumn(g)).toBe('E');
      }
    });

    it('maps grade 4-6 to column D (below average)', () => {
      for (let g = 4; g <= 6; g++) {
        expect(gradeToColumn(g)).toBe('D');
      }
    });

    it('maps grade 7-12 to column C (average)', () => {
      for (let g = 7; g <= 12; g++) {
        expect(gradeToColumn(g)).toBe('C');
      }
    });

    it('maps grade 13-18 to column B (strong)', () => {
      for (let g = 13; g <= 18; g++) {
        expect(gradeToColumn(g)).toBe('B');
      }
    });

    it('maps grade 19-30 to column A (elite)', () => {
      for (let g = 19; g <= 30; g++) {
        expect(gradeToColumn(g)).toBe('A');
      }
    });
  });

  describe('generateApbaCard()', () => {
    it('produces 5 columns with exactly 36 outcomes each', () => {
      const card = generateApbaCard(avgHitterRates(), defaultArchetype());
      const columns: ApbaColumn[] = ['A', 'B', 'C', 'D', 'E'];
      for (const col of columns) {
        expect(card[col]).toHaveLength(36);
      }
    });

    it('column C outcomes reflect player base rates (within rounding)', () => {
      const rates = avgHitterRates();
      const card = generateApbaCard(rates, defaultArchetype());
      const col = card.C;

      // Walk slots: 0.09 * 36 = 3.24 -> ~3
      expect(walkCount(col)).toBeGreaterThanOrEqual(2);
      expect(walkCount(col)).toBeLessThanOrEqual(5);

      // K slots: 0.17 * 36 = 6.12 -> ~6
      expect(strikeoutCount(col)).toBeGreaterThanOrEqual(4);
      expect(strikeoutCount(col)).toBeLessThanOrEqual(8);

      // HR slots: 0.035 * 36 = 1.26 -> ~1
      expect(hrCount(col)).toBeGreaterThanOrEqual(1);
      expect(hrCount(col)).toBeLessThanOrEqual(3);

      // Hit slots (all): 0.255 * 36 = 9.18 -> ~9
      expect(hitCount(col)).toBeGreaterThanOrEqual(7);
      expect(hitCount(col)).toBeLessThanOrEqual(12);
    });

    it('column A has fewer hits than column C (pitcher suppression)', () => {
      const card = generateApbaCard(avgHitterRates(), defaultArchetype());
      expect(hitCount(card.A)).toBeLessThan(hitCount(card.C));
    });

    it('column A has more strikeouts than column C', () => {
      const card = generateApbaCard(avgHitterRates(), defaultArchetype());
      expect(strikeoutCount(card.A)).toBeGreaterThan(strikeoutCount(card.C));
    });

    it('column E has more hits than column C (wild pitcher boost)', () => {
      const card = generateApbaCard(avgHitterRates(), defaultArchetype());
      expect(hitCount(card.E)).toBeGreaterThan(hitCount(card.C));
    });

    it('column E has fewer strikeouts than column C', () => {
      const card = generateApbaCard(avgHitterRates(), defaultArchetype());
      expect(strikeoutCount(card.E)).toBeLessThan(strikeoutCount(card.C));
    });

    it('monotonic gradient: hits decrease A < B < C < D < E', () => {
      const card = generateApbaCard(avgHitterRates(), defaultArchetype());
      const hits = ['A', 'B', 'C', 'D', 'E'].map(
        (col) => hitCount(card[col as ApbaColumn]),
      );
      // Allow equal adjacent (rounding), but overall A <= B <= C <= D <= E
      for (let i = 0; i < hits.length - 1; i++) {
        expect(hits[i]).toBeLessThanOrEqual(hits[i + 1]);
      }
      // A strictly less than E
      expect(hits[0]).toBeLessThan(hits[4]);
    });

    it('power hitter has more HR slots than contact hitter in column C', () => {
      const powerCard = generateApbaCard(powerHitterRates(), { byte33: 1, byte34: 0 });
      const contactCard = generateApbaCard(contactHitterRates(), { byte33: 0, byte34: 2 });
      expect(hrCount(powerCard.C)).toBeGreaterThan(hrCount(contactCard.C));
    });

    it('all outcomes are valid OutcomeCategory values', () => {
      const validOutcomes = new Set(Object.values(OutcomeCategory).filter((v) => typeof v === 'number'));
      const card = generateApbaCard(avgHitterRates(), defaultArchetype());
      const columns: ApbaColumn[] = ['A', 'B', 'C', 'D', 'E'];
      for (const col of columns) {
        for (const oc of card[col]) {
          expect(validOutcomes.has(oc)).toBe(true);
        }
      }
    });

    it('does not include no-PA events on the card', () => {
      const noPAEvents = new Set([
        OutcomeCategory.STOLEN_BASE_OPP,
        OutcomeCategory.WILD_PITCH,
        OutcomeCategory.BALK,
        OutcomeCategory.PASSED_BALL,
        OutcomeCategory.SPECIAL_EVENT,
      ]);
      const card = generateApbaCard(avgHitterRates(), defaultArchetype());
      const columns: ApbaColumn[] = ['A', 'B', 'C', 'D', 'E'];
      for (const col of columns) {
        for (const oc of card[col]) {
          expect(noPAEvents.has(oc)).toBe(false);
        }
      }
    });
  });

  describe('generatePitcherApbaCard()', () => {
    it('produces 5 columns with exactly 36 outcomes each', () => {
      const card = generatePitcherApbaCard();
      const columns: ApbaColumn[] = ['A', 'B', 'C', 'D', 'E'];
      for (const col of columns) {
        expect(card[col]).toHaveLength(36);
      }
    });

    it('column C is mostly outs and strikeouts (85%+ combined)', () => {
      const card = generatePitcherApbaCard();
      const outs = card.C.filter((oc) =>
        oc === OutcomeCategory.GROUND_OUT
        || oc === OutcomeCategory.FLY_OUT
        || oc === OutcomeCategory.LINE_OUT
        || oc === OutcomeCategory.POP_OUT
        || oc === OutcomeCategory.GROUND_OUT_ADVANCE
        || oc === OutcomeCategory.DOUBLE_PLAY
        || oc === OutcomeCategory.STRIKEOUT_LOOKING
        || oc === OutcomeCategory.STRIKEOUT_SWINGING,
      ).length;
      // 85% of 36 = 30.6
      expect(outs).toBeGreaterThanOrEqual(30);
    });

    it('has very few hits on column C', () => {
      const card = generatePitcherApbaCard();
      // Pitcher BA ~ .100-.200 -> ~3-7 hit slots out of 36
      expect(hitCount(card.C)).toBeLessThanOrEqual(7);
    });
  });

  describe('COLUMN_MULTIPLIERS', () => {
    it('column C multipliers are all 1.0', () => {
      const c = COLUMN_MULTIPLIERS.C;
      expect(c.single).toBe(1.0);
      expect(c.double).toBe(1.0);
      expect(c.triple).toBe(1.0);
      expect(c.hr).toBe(1.0);
      expect(c.walk).toBe(1.0);
      expect(c.strikeout).toBe(1.0);
    });

    it('column A multipliers suppress reach-base outcomes', () => {
      const a = COLUMN_MULTIPLIERS.A;
      expect(a.single).toBeLessThan(1.0);
      expect(a.double).toBeLessThan(1.0);
      expect(a.hr).toBeLessThan(1.0);
      expect(a.walk).toBeLessThan(1.0);
      expect(a.strikeout).toBeGreaterThan(1.0);
    });

    it('column E multipliers boost reach-base outcomes', () => {
      const e = COLUMN_MULTIPLIERS.E;
      expect(e.single).toBeGreaterThan(1.0);
      expect(e.double).toBeGreaterThan(1.0);
      expect(e.hr).toBeGreaterThan(1.0);
      expect(e.walk).toBeGreaterThan(1.0);
      expect(e.strikeout).toBeLessThan(1.0);
    });
  });
});
