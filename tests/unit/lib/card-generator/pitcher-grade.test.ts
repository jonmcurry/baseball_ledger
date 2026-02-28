import {
  computeERAPercentile,
  percentileToGrade,
  computePitcherGrade,
  eraToGrade,
} from '@lib/card-generator/pitcher-grade';

describe('computeERAPercentile', () => {
  it('returns 0.49 for empty ERA list', () => {
    expect(computeERAPercentile(3.50, [])).toBe(0.49);
  });

  it('returns 0.49 for single pitcher (edge case)', () => {
    expect(computeERAPercentile(3.50, [3.50])).toBe(0.49);
  });

  it('returns 0 for best ERA in list', () => {
    const allERAs = [2.00, 3.00, 4.00, 5.00, 6.00];
    expect(computeERAPercentile(2.00, allERAs)).toBe(0);
  });

  it('returns 0.8 for worst ERA in list of 5', () => {
    const allERAs = [2.00, 3.00, 4.00, 5.00, 6.00];
    // 4 pitchers have lower ERA, so 4/5 = 0.8
    expect(computeERAPercentile(6.00, allERAs)).toBe(0.8);
  });

  it('computes correct percentile for middle pitcher', () => {
    const allERAs = [2.00, 3.00, 4.00, 5.00, 6.00];
    // 2 pitchers have lower ERA than 4.00, so 2/5 = 0.4
    expect(computeERAPercentile(4.00, allERAs)).toBe(0.4);
  });

  it('handles large ERA list correctly', () => {
    // 100 pitchers with ERAs from 1.00 to 10.00
    const allERAs = Array.from({ length: 100 }, (_, i) => 1.0 + (i * 9.0) / 99);
    // Pitcher with ERA 1.0 should be near the top (percentile ~0)
    expect(computeERAPercentile(1.0, allERAs)).toBe(0);
    // Pitcher with ERA 10.0 should be near the bottom
    expect(computeERAPercentile(10.0, allERAs)).toBeCloseTo(0.99, 2);
  });

  it('handles tied ERAs', () => {
    const allERAs = [3.00, 3.00, 3.00, 5.00, 5.00];
    // No pitcher has ERA < 3.00, so percentile = 0/5 = 0
    expect(computeERAPercentile(3.00, allERAs)).toBe(0);
    // 3 pitchers have ERA < 5.00, so percentile = 3/5 = 0.6
    expect(computeERAPercentile(5.00, allERAs)).toBe(0.6);
  });
});

describe('percentileToGrade (REQ-DATA-005a) - 22 tier scale', () => {
  it('maps top 0.5% to grade 22 (Historic ace)', () => {
    expect(percentileToGrade(0)).toBe(22);
    expect(percentileToGrade(0.002)).toBe(22);
    expect(percentileToGrade(0.004)).toBe(22);
  });

  it('maps top 1.0% to grade 21 (Dominant)', () => {
    expect(percentileToGrade(0.005)).toBe(21);
    expect(percentileToGrade(0.007)).toBe(21);
    expect(percentileToGrade(0.009)).toBe(21);
  });

  it('maps top 1.5% to grade 20 (Elite+)', () => {
    expect(percentileToGrade(0.010)).toBe(20);
    expect(percentileToGrade(0.012)).toBe(20);
    expect(percentileToGrade(0.014)).toBe(20);
  });

  it('maps top 2.0% to grade 19 (Elite)', () => {
    expect(percentileToGrade(0.015)).toBe(19);
    expect(percentileToGrade(0.017)).toBe(19);
    expect(percentileToGrade(0.019)).toBe(19);
  });

  it('maps top 2.5% to grade 18 (Near-elite)', () => {
    expect(percentileToGrade(0.020)).toBe(18);
    expect(percentileToGrade(0.022)).toBe(18);
    expect(percentileToGrade(0.024)).toBe(18);
  });

  it('maps top 3.0% to grade 17 (Ace+)', () => {
    expect(percentileToGrade(0.025)).toBe(17);
    expect(percentileToGrade(0.027)).toBe(17);
    expect(percentileToGrade(0.029)).toBe(17);
  });

  it('maps top 4.0% to grade 16 (Ace)', () => {
    expect(percentileToGrade(0.030)).toBe(16);
    expect(percentileToGrade(0.035)).toBe(16);
    expect(percentileToGrade(0.039)).toBe(16);
  });

  it('maps top 7% to grade 15 (Strong ace)', () => {
    expect(percentileToGrade(0.040)).toBe(15);
    expect(percentileToGrade(0.05)).toBe(15);
    expect(percentileToGrade(0.069)).toBe(15);
  });

  it('maps top 10% to grade 14 (Elite starter)', () => {
    expect(percentileToGrade(0.07)).toBe(14);
    expect(percentileToGrade(0.08)).toBe(14);
    expect(percentileToGrade(0.099)).toBe(14);
  });

  it('maps top 15% to grade 13 (#1 starter)', () => {
    expect(percentileToGrade(0.10)).toBe(13);
    expect(percentileToGrade(0.12)).toBe(13);
    expect(percentileToGrade(0.149)).toBe(13);
  });

  it('maps top 22% to grade 12 (Strong starter)', () => {
    expect(percentileToGrade(0.15)).toBe(12);
    expect(percentileToGrade(0.18)).toBe(12);
    expect(percentileToGrade(0.219)).toBe(12);
  });

  it('maps top 30% to grade 11 (Above average)', () => {
    expect(percentileToGrade(0.22)).toBe(11);
    expect(percentileToGrade(0.25)).toBe(11);
    expect(percentileToGrade(0.299)).toBe(11);
  });

  it('maps top 40% to grade 10 (Solid starter)', () => {
    expect(percentileToGrade(0.30)).toBe(10);
    expect(percentileToGrade(0.35)).toBe(10);
  });

  it('maps top 50% to grade 9 (Average)', () => {
    expect(percentileToGrade(0.40)).toBe(9);
    expect(percentileToGrade(0.45)).toBe(9);
    expect(percentileToGrade(0.499)).toBe(9);
  });

  it('maps top 60% to grade 8', () => {
    expect(percentileToGrade(0.50)).toBe(8);
    expect(percentileToGrade(0.55)).toBe(8);
  });

  it('maps top 70% to grade 7', () => {
    expect(percentileToGrade(0.60)).toBe(7);
    expect(percentileToGrade(0.65)).toBe(7);
  });

  it('maps top 80% to grade 6', () => {
    expect(percentileToGrade(0.70)).toBe(6);
    expect(percentileToGrade(0.75)).toBe(6);
  });

  it('maps top 87% to grade 5', () => {
    expect(percentileToGrade(0.80)).toBe(5);
    expect(percentileToGrade(0.85)).toBe(5);
  });

  it('maps top 93% to grade 4', () => {
    expect(percentileToGrade(0.87)).toBe(4);
    expect(percentileToGrade(0.90)).toBe(4);
  });

  it('maps top 97% to grade 3', () => {
    expect(percentileToGrade(0.93)).toBe(3);
    expect(percentileToGrade(0.95)).toBe(3);
  });

  it('maps top 99% to grade 2', () => {
    expect(percentileToGrade(0.97)).toBe(2);
    expect(percentileToGrade(0.98)).toBe(2);
  });

  it('maps bottom 1% to grade 1', () => {
    expect(percentileToGrade(0.99)).toBe(1);
    expect(percentileToGrade(1.0)).toBe(1);
  });
});

describe('eraToGrade - absolute ERA-to-grade mapping', () => {
  it('maps sub-1.50 ERA to grade 22 (historic)', () => {
    expect(eraToGrade(1.12)).toBe(22); // Bob Gibson 1968
    expect(eraToGrade(1.50)).toBe(22);
  });

  it('maps 1.51-1.80 ERA to grade 21 (dominant)', () => {
    expect(eraToGrade(1.74)).toBe(21); // Pedro Martinez 2000
    expect(eraToGrade(1.80)).toBe(21);
  });

  it('maps 1.81-2.00 ERA to grade 20 (elite+)', () => {
    expect(eraToGrade(1.82)).toBe(20); // Vida Blue 1971
    expect(eraToGrade(2.00)).toBe(20);
  });

  it('maps 2.01-2.20 ERA to grade 19 (elite)', () => {
    expect(eraToGrade(2.10)).toBe(19);
    expect(eraToGrade(2.20)).toBe(19);
  });

  it('maps 2.41-2.60 ERA to grade 17 (ace+)', () => {
    expect(eraToGrade(2.50)).toBe(17);
  });

  it('maps 2.81-3.00 ERA to grade 15 (strong ace) -> Column B', () => {
    expect(eraToGrade(2.90)).toBe(15);
    expect(eraToGrade(3.00)).toBe(15);
  });

  it('maps 3.21-3.50 ERA to grade 13 (#1 starter) -> Column C', () => {
    expect(eraToGrade(3.25)).toBe(13);
    expect(eraToGrade(3.50)).toBe(13);
  });

  it('maps 4.21-4.50 ERA to grade 9 (average) -> Column C', () => {
    expect(eraToGrade(4.30)).toBe(9);
    expect(eraToGrade(4.50)).toBe(9);
  });

  it('maps 5.01-5.20 ERA to grade 6 (spot starter) -> Column D', () => {
    expect(eraToGrade(5.10)).toBe(6);
  });

  it('maps ERA > 7.00 to grade 1 (worst) -> Column E', () => {
    expect(eraToGrade(7.50)).toBe(1);
    expect(eraToGrade(10.00)).toBe(1);
  });

  it('grade is always between 1 and 22', () => {
    for (let era = 0.50; era <= 12.0; era += 0.25) {
      const grade = eraToGrade(era);
      expect(grade).toBeGreaterThanOrEqual(1);
      expect(grade).toBeLessThanOrEqual(22);
    }
  });
});

describe('computePitcherGrade - absolute ERA mapping (ignores pool)', () => {
  it('uses absolute scale, ignoring allERAs parameter', () => {
    // Same ERA should always produce the same grade regardless of pool
    const grade1 = computePitcherGrade(2.50);
    const grade2 = computePitcherGrade(2.50, [1.00, 2.00, 3.00]);
    const grade3 = computePitcherGrade(2.50, [2.40, 2.45, 2.50, 2.55, 2.60]);
    expect(grade1).toBe(grade2);
    expect(grade2).toBe(grade3);
    expect(grade1).toBe(17); // 2.50 ERA -> grade 17
  });

  it('Vida Blue 1971 (1.82 ERA) gets grade 20 (elite+)', () => {
    expect(computePitcherGrade(1.82)).toBe(20);
  });

  it('Pedro Martinez 2000 (1.74 ERA) gets grade 21 (dominant)', () => {
    expect(computePitcherGrade(1.74)).toBe(21);
  });

  it('average 4.50 ERA pitcher gets grade 9 (Column C)', () => {
    expect(computePitcherGrade(4.50)).toBe(9);
  });

  it('poor 5.50 ERA pitcher gets grade 5 (Column D)', () => {
    expect(computePitcherGrade(5.50)).toBe(5);
  });

  it('terrible 6.50 ERA pitcher gets grade 2 (Column E)', () => {
    expect(computePitcherGrade(6.50)).toBe(2);
  });
});
