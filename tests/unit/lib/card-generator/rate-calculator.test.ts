import { computePlayerRates } from '@lib/card-generator/rate-calculator';
import type { BattingStats } from '@lib/types';

function makeBattingStats(overrides: Partial<BattingStats> = {}): BattingStats {
  return {
    G: 0, AB: 0, R: 0, H: 0, doubles: 0, triples: 0, HR: 0, RBI: 0,
    SB: 0, CS: 0, BB: 0, SO: 0, IBB: 0, HBP: 0, SH: 0, SF: 0, GIDP: 0,
    BA: 0, OBP: 0, SLG: 0, OPS: 0,
    ...overrides,
  };
}

describe('computePlayerRates (REQ-DATA-005 Step 1)', () => {
  it('computes PA correctly', () => {
    // PA = AB + BB + HBP + SH + SF
    const stats = makeBattingStats({ AB: 500, BB: 60, HBP: 5, SH: 3, SF: 7 });
    const rates = computePlayerRates(stats);
    expect(rates.PA).toBe(575);
  });

  it('computes walk rate', () => {
    const stats = makeBattingStats({ AB: 500, BB: 50, HBP: 0, SH: 0, SF: 0 });
    const rates = computePlayerRates(stats);
    // 50 / 550 = 0.0909...
    expect(rates.walkRate).toBeCloseTo(50 / 550, 6);
  });

  it('computes strikeout rate', () => {
    const stats = makeBattingStats({ AB: 500, BB: 50, SO: 100, HBP: 0, SH: 0, SF: 0 });
    const rates = computePlayerRates(stats);
    expect(rates.strikeoutRate).toBeCloseTo(100 / 550, 6);
  });

  it('computes home run rate', () => {
    const stats = makeBattingStats({ AB: 500, BB: 50, HR: 30, H: 150, HBP: 0, SH: 0, SF: 0 });
    const rates = computePlayerRates(stats);
    expect(rates.homeRunRate).toBeCloseTo(30 / 550, 6);
  });

  it('computes single rate (H - 2B - 3B - HR) / PA', () => {
    const stats = makeBattingStats({
      AB: 500, BB: 50, H: 150, doubles: 30, triples: 5, HR: 25,
      HBP: 0, SH: 0, SF: 0,
    });
    const rates = computePlayerRates(stats);
    // singles = 150 - 30 - 5 - 25 = 90
    expect(rates.singleRate).toBeCloseTo(90 / 550, 6);
  });

  it('computes double rate', () => {
    const stats = makeBattingStats({
      AB: 500, BB: 50, doubles: 30, HBP: 0, SH: 0, SF: 0,
    });
    const rates = computePlayerRates(stats);
    expect(rates.doubleRate).toBeCloseTo(30 / 550, 6);
  });

  it('computes triple rate', () => {
    const stats = makeBattingStats({
      AB: 500, BB: 50, triples: 8, HBP: 0, SH: 0, SF: 0,
    });
    const rates = computePlayerRates(stats);
    expect(rates.tripleRate).toBeCloseTo(8 / 550, 6);
  });

  it('computes SB rate as SB / (SB + CS)', () => {
    const stats = makeBattingStats({
      AB: 500, BB: 50, SB: 30, CS: 10, HBP: 0, SH: 0, SF: 0,
    });
    const rates = computePlayerRates(stats);
    expect(rates.sbRate).toBeCloseTo(30 / 40, 6);
  });

  it('returns sbRate = 0 when no steal attempts', () => {
    const stats = makeBattingStats({
      AB: 500, BB: 50, SB: 0, CS: 0, HBP: 0, SH: 0, SF: 0,
    });
    const rates = computePlayerRates(stats);
    expect(rates.sbRate).toBe(0);
  });

  it('computes ISO from SLG - BA', () => {
    const stats = makeBattingStats({
      AB: 500, BB: 50, BA: 0.300, SLG: 0.550, HBP: 0, SH: 0, SF: 0,
    });
    const rates = computePlayerRates(stats);
    expect(rates.iso).toBeCloseTo(0.250, 6);
  });

  it('computes HBP, SF, SH, GIDP rates', () => {
    const stats = makeBattingStats({
      AB: 500, BB: 50, HBP: 10, SF: 5, SH: 8, GIDP: 15,
    });
    const rates = computePlayerRates(stats);
    const PA = 500 + 50 + 10 + 8 + 5; // 573
    expect(rates.hbpRate).toBeCloseTo(10 / PA, 6);
    expect(rates.sfRate).toBeCloseTo(5 / PA, 6);
    expect(rates.shRate).toBeCloseTo(8 / PA, 6);
    expect(rates.gdpRate).toBeCloseTo(15 / PA, 6);
  });

  it('handles zero PA gracefully', () => {
    const stats = makeBattingStats();
    const rates = computePlayerRates(stats);
    expect(rates.PA).toBe(0);
    expect(rates.walkRate).toBe(0);
    expect(rates.strikeoutRate).toBe(0);
    expect(rates.homeRunRate).toBe(0);
    expect(rates.singleRate).toBe(0);
    expect(rates.doubleRate).toBe(0);
    expect(rates.tripleRate).toBe(0);
    expect(rates.sbRate).toBe(0);
    expect(rates.iso).toBe(0);
  });

  it('clamps negative single rate to 0', () => {
    // Edge case: H < doubles + triples + HR (bad data)
    const stats = makeBattingStats({
      AB: 100, BB: 10, H: 10, doubles: 5, triples: 3, HR: 5,
      HBP: 0, SH: 0, SF: 0,
    });
    const rates = computePlayerRates(stats);
    // singles = 10 - 5 - 3 - 5 = -3 -> clamped to 0
    expect(rates.singleRate).toBe(0);
  });

  it('produces realistic rates for a typical 1971 Hank Aaron line', () => {
    // Aaron 1971: .327 BA, 47 HR, 495 AB, 71 BB, 58 SO, 26 2B, 3 3B
    const stats = makeBattingStats({
      G: 139, AB: 495, R: 95, H: 162, doubles: 22, triples: 3, HR: 47,
      RBI: 118, SB: 1, CS: 1, BB: 71, SO: 58, IBB: 19, HBP: 2, SH: 0, SF: 5,
      GIDP: 13, BA: 0.327, OBP: 0.410, SLG: 0.669, OPS: 1.079,
    });
    const rates = computePlayerRates(stats);

    expect(rates.PA).toBe(573); // 495+71+2+0+5
    expect(rates.walkRate).toBeCloseTo(0.124, 2);
    expect(rates.strikeoutRate).toBeCloseTo(0.101, 2);
    expect(rates.homeRunRate).toBeCloseTo(0.082, 2);
    expect(rates.singleRate).toBeCloseTo(0.157, 2); // (162-22-3-47)/573=90/573
    expect(rates.iso).toBeCloseTo(0.342, 2);
  });
});
