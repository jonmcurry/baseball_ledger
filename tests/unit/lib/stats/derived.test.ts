/**
 * Tests for Derived Stats Calculator (REQ-STS-002)
 *
 * All derived statistics computed from base accumulators.
 * IP uses baseball notation: .1 = 1/3, .2 = 2/3 innings.
 */

import type { BattingStats, PitchingStats } from '@lib/types/stats';
import {
  computeBA,
  computeOBP,
  computeSLG,
  computeOPS,
  computeERA,
  computeWHIP,
  computeK9,
  computeBB9,
  ipToDecimal,
  addIP,
  computeDerivedBatting,
  computeDerivedPitching,
} from '@lib/stats/derived';

// ---------------------------------------------------------------------------
// ipToDecimal
// ---------------------------------------------------------------------------

describe('ipToDecimal', () => {
  it('converts whole innings (6.0 -> 6.0)', () => {
    expect(ipToDecimal(6.0)).toBeCloseTo(6.0, 5);
  });

  it('converts .1 to one-third (6.1 -> 6.333)', () => {
    expect(ipToDecimal(6.1)).toBeCloseTo(6 + 1 / 3, 5);
  });

  it('converts .2 to two-thirds (6.2 -> 6.667)', () => {
    expect(ipToDecimal(6.2)).toBeCloseTo(6 + 2 / 3, 5);
  });

  it('handles zero (0.0 -> 0)', () => {
    expect(ipToDecimal(0.0)).toBeCloseTo(0, 5);
  });

  it('handles fractional only (0.1 -> 0.333)', () => {
    expect(ipToDecimal(0.1)).toBeCloseTo(1 / 3, 5);
  });

  it('handles 0.2 -> 0.667', () => {
    expect(ipToDecimal(0.2)).toBeCloseTo(2 / 3, 5);
  });
});

// ---------------------------------------------------------------------------
// addIP
// ---------------------------------------------------------------------------

describe('addIP', () => {
  it('adds whole innings (3.0 + 4.0 = 7.0)', () => {
    expect(addIP(3.0, 4.0)).toBeCloseTo(7.0, 5);
  });

  it('carries thirds correctly (6.2 + 0.1 = 7.0)', () => {
    expect(addIP(6.2, 0.1)).toBeCloseTo(7.0, 5);
  });

  it('adds partial innings (3.1 + 2.2 = 6.0)', () => {
    expect(addIP(3.1, 2.2)).toBeCloseTo(6.0, 5);
  });

  it('handles double carry (3.2 + 2.2 = 6.1)', () => {
    expect(addIP(3.2, 2.2)).toBeCloseTo(6.1, 5);
  });

  it('adds zero (5.1 + 0.0 = 5.1)', () => {
    expect(addIP(5.1, 0.0)).toBeCloseTo(5.1, 5);
  });

  it('adds two zeros (0.0 + 0.0 = 0.0)', () => {
    expect(addIP(0.0, 0.0)).toBeCloseTo(0.0, 5);
  });
});

// ---------------------------------------------------------------------------
// computeBA
// ---------------------------------------------------------------------------

describe('computeBA', () => {
  it('computes batting average', () => {
    expect(computeBA(150, 500)).toBeCloseTo(0.300, 3);
  });

  it('returns 0 when AB is 0', () => {
    expect(computeBA(0, 0)).toBe(0);
  });

  it('handles perfect 1.000', () => {
    expect(computeBA(3, 3)).toBeCloseTo(1.0, 3);
  });
});

// ---------------------------------------------------------------------------
// computeOBP
// ---------------------------------------------------------------------------

describe('computeOBP', () => {
  it('computes on-base percentage', () => {
    // OBP = (150 + 60 + 5) / (500 + 60 + 5 + 4) = 215/569 = 0.37785
    expect(computeOBP(150, 60, 5, 500, 4)).toBeCloseTo(215 / 569, 4);
  });

  it('returns 0 when denominator is 0', () => {
    expect(computeOBP(0, 0, 0, 0, 0)).toBe(0);
  });

  it('handles walks-only scenario', () => {
    // 0 AB, 10 BB, 0 HBP, 0 SF -> OBP = 10/10 = 1.0
    expect(computeOBP(0, 10, 0, 0, 0)).toBeCloseTo(1.0, 3);
  });
});

// ---------------------------------------------------------------------------
// computeSLG
// ---------------------------------------------------------------------------

describe('computeSLG', () => {
  it('computes slugging percentage', () => {
    // H=150, 2B=30, 3B=5, HR=20 -> 1B=95
    // SLG = (95 + 60 + 15 + 80) / 500 = 250/500 = 0.500
    expect(computeSLG(150, 30, 5, 20, 500)).toBeCloseTo(0.500, 3);
  });

  it('returns 0 when AB is 0', () => {
    expect(computeSLG(0, 0, 0, 0, 0)).toBe(0);
  });

  it('handles all singles', () => {
    // H=100, 2B=0, 3B=0, HR=0 -> SLG = 100/500 = 0.200
    expect(computeSLG(100, 0, 0, 0, 500)).toBeCloseTo(0.200, 3);
  });

  it('handles all home runs', () => {
    // H=50, 2B=0, 3B=0, HR=50 -> SLG = (0 + 0 + 0 + 200) / 200 = 1.000
    expect(computeSLG(50, 0, 0, 50, 200)).toBeCloseTo(1.000, 3);
  });
});

// ---------------------------------------------------------------------------
// computeOPS
// ---------------------------------------------------------------------------

describe('computeOPS', () => {
  it('computes OPS as OBP + SLG', () => {
    expect(computeOPS(0.350, 0.500)).toBeCloseTo(0.850, 3);
  });
});

// ---------------------------------------------------------------------------
// computeERA
// ---------------------------------------------------------------------------

describe('computeERA', () => {
  it('computes ERA from earned runs and IP', () => {
    // ERA = 30 * 9 / 200 = 1.35
    expect(computeERA(30, 200.0)).toBeCloseTo(1.35, 2);
  });

  it('returns 0 when IP is 0', () => {
    expect(computeERA(5, 0.0)).toBe(0);
  });

  it('handles fractional IP (baseball notation)', () => {
    // 3 ER in 6.1 IP -> 6.333 decimal -> ERA = 27/6.333 = 4.263
    expect(computeERA(3, 6.1)).toBeCloseTo(3 * 9 / (6 + 1 / 3), 2);
  });
});

// ---------------------------------------------------------------------------
// computeWHIP
// ---------------------------------------------------------------------------

describe('computeWHIP', () => {
  it('computes WHIP', () => {
    // WHIP = (50 + 180) / 200 = 1.15
    expect(computeWHIP(50, 180, 200.0)).toBeCloseTo(1.15, 2);
  });

  it('returns 0 when IP is 0', () => {
    expect(computeWHIP(10, 20, 0.0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeK9 / computeBB9
// ---------------------------------------------------------------------------

describe('computeK9', () => {
  it('computes strikeouts per 9 innings', () => {
    // K/9 = 200 * 9 / 200 = 9.0
    expect(computeK9(200, 200.0)).toBeCloseTo(9.0, 2);
  });

  it('returns 0 when IP is 0', () => {
    expect(computeK9(50, 0.0)).toBe(0);
  });
});

describe('computeBB9', () => {
  it('computes walks per 9 innings', () => {
    // BB/9 = 50 * 9 / 200 = 2.25
    expect(computeBB9(50, 200.0)).toBeCloseTo(2.25, 2);
  });

  it('returns 0 when IP is 0', () => {
    expect(computeBB9(10, 0.0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeDerivedBatting
// ---------------------------------------------------------------------------

describe('computeDerivedBatting', () => {
  it('computes all derived batting stats', () => {
    const stats: BattingStats = {
      G: 100, AB: 400, R: 60, H: 120, doubles: 25, triples: 3, HR: 15,
      RBI: 55, SB: 10, CS: 3, BB: 50, SO: 80, IBB: 5, HBP: 3, SH: 2, SF: 4, GIDP: 8,
      BA: 0, OBP: 0, SLG: 0, OPS: 0,
    };
    const result = computeDerivedBatting(stats);
    expect(result.BA).toBeCloseTo(120 / 400, 3);
    // OBP = (120 + 50 + 3) / (400 + 50 + 3 + 4) = 173/457
    expect(result.OBP).toBeCloseTo(173 / 457, 3);
    // SLG: 1B=77, TB = 77 + 50 + 9 + 60 = 196, SLG = 196/400
    expect(result.SLG).toBeCloseTo(196 / 400, 3);
    expect(result.OPS).toBeCloseTo(result.OBP + result.SLG, 3);
  });
});

// ---------------------------------------------------------------------------
// computeDerivedPitching
// ---------------------------------------------------------------------------

describe('computeDerivedPitching', () => {
  it('computes all derived pitching stats', () => {
    const stats: PitchingStats = {
      G: 30, GS: 30, W: 15, L: 8, SV: 0, IP: 200.0, H: 180, R: 80, ER: 70,
      HR: 20, BB: 50, SO: 200, HBP: 5, BF: 850, WP: 3, BK: 0, CG: 2, SHO: 1,
      HLD: 0, BS: 0,
      ERA: 0, WHIP: 0,
    };
    const result = computeDerivedPitching(stats);
    expect(result.ERA).toBeCloseTo(70 * 9 / 200, 2);
    expect(result.WHIP).toBeCloseTo((50 + 180) / 200, 2);
  });
});
