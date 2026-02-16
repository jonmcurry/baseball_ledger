/**
 * WINBB.EXE Data Segment Extractor Tests
 *
 * Verifies extraction of the variance table and IDT weights from the real
 * WINBB.EXE binary.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  BBW_VARIANCE_TABLE,
  BBW_IDT_WEIGHTS,
  BBW_IDT_BITMAP,
  extractDataSegment,
  extractVarianceTable,
  extractIdtWeights,
  extractIdtBitmap,
  computeIdtBitmask,
  isIdtRowActive,
} from '@lib/bbw/exe-extractor';

const WINBB_PATH = resolve(__dirname, '../../../../BBW/WINBB.EXE');

let dataSegment: DataView;

beforeAll(() => {
  const buffer = readFileSync(WINBB_PATH).buffer;
  dataSegment = extractDataSegment(buffer);
});

describe('extractDataSegment', () => {
  it('extracts a DataView from WINBB.EXE', () => {
    expect(dataSegment).toBeInstanceOf(DataView);
    expect(dataSegment.byteLength).toBeGreaterThan(0x3842);
  });

  it('throws on non-MZ file', () => {
    const badBuffer = new ArrayBuffer(100);
    expect(() => extractDataSegment(badBuffer)).toThrow('Not an MZ executable');
  });
});

describe('BBW_VARIANCE_TABLE (hardcoded constant)', () => {
  it('has exactly 40 entries', () => {
    expect(BBW_VARIANCE_TABLE).toHaveLength(40);
  });

  it('range is [-3, +3]', () => {
    for (const v of BBW_VARIANCE_TABLE) {
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThanOrEqual(3);
    }
  });

  it('distribution: 1x(+3), 3x(+2), 6x(+1), 20x(0), 6x(-1), 3x(-2), 1x(-3)', () => {
    const counts = new Map<number, number>();
    for (const v of BBW_VARIANCE_TABLE) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    expect(counts.get(3)).toBe(1);
    expect(counts.get(2)).toBe(3);
    expect(counts.get(1)).toBe(6);
    expect(counts.get(0)).toBe(20);
    expect(counts.get(-1)).toBe(6);
    expect(counts.get(-2)).toBe(3);
    expect(counts.get(-3)).toBe(1);
  });

  it('mean is exactly 0.0 (symmetric)', () => {
    const sum = BBW_VARIANCE_TABLE.reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });
});

describe('extractVarianceTable (from binary)', () => {
  it('matches the hardcoded constant', () => {
    const extracted = extractVarianceTable(dataSegment);
    expect(extracted).toEqual([...BBW_VARIANCE_TABLE]);
  });
});

describe('BBW_IDT_WEIGHTS (hardcoded constant)', () => {
  it('has exactly 9 entries (rows 15-23)', () => {
    expect(BBW_IDT_WEIGHTS).toHaveLength(9);
  });

  it('total weight is 12', () => {
    const total = BBW_IDT_WEIGHTS.reduce((a, b) => a + b, 0);
    expect(total).toBe(12);
  });

  it('all weights are 1 or 2', () => {
    for (const w of BBW_IDT_WEIGHTS) {
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(2);
    }
  });
});

describe('extractIdtWeights (from binary)', () => {
  it('matches the hardcoded constant', () => {
    const extracted = extractIdtWeights(dataSegment);
    expect(extracted).toEqual([...BBW_IDT_WEIGHTS]);
  });
});

describe('BBW_IDT_BITMAP (hardcoded constant)', () => {
  it('has exactly 9 entries (rows 15-23)', () => {
    expect(BBW_IDT_BITMAP).toHaveLength(9);
  });

  it('all values are valid single bytes (0-255)', () => {
    for (const b of BBW_IDT_BITMAP) {
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(255);
    }
  });

  it('5 of 9 rows are never gated (bitmap = 0x00)', () => {
    const neverGated = BBW_IDT_BITMAP.filter(b => b === 0x00);
    expect(neverGated).toHaveLength(5);
  });

  it('rows 15, 19, 20, 21, 23 are always active (0x00)', () => {
    expect(BBW_IDT_BITMAP[0]).toBe(0x00); // row 15: WALK
    expect(BBW_IDT_BITMAP[4]).toBe(0x00); // row 19: HR_VARIANT
    expect(BBW_IDT_BITMAP[5]).toBe(0x00); // row 20: HBP
    expect(BBW_IDT_BITMAP[6]).toBe(0x00); // row 21: HR
    expect(BBW_IDT_BITMAP[8]).toBe(0x00); // row 23: LINE_OUT
  });

  it('gated rows have expected bitmap values', () => {
    expect(BBW_IDT_BITMAP[1]).toBe(0x04); // row 16: PASSED_BALL
    expect(BBW_IDT_BITMAP[2]).toBe(0x02); // row 17: ERROR
    expect(BBW_IDT_BITMAP[3]).toBe(0x05); // row 18: SPECIAL_EVENT
    expect(BBW_IDT_BITMAP[7]).toBe(0x0E); // row 22: FLY_OUT
  });
});

describe('extractIdtBitmap (from binary)', () => {
  it('matches the hardcoded constant', () => {
    const extracted = extractIdtBitmap(dataSegment);
    expect(extracted).toEqual([...BBW_IDT_BITMAP]);
  });
});

describe('computeIdtBitmask', () => {
  it('returns power of 2 for card values 15-22', () => {
    for (let cv = 15; cv <= 22; cv++) {
      const mask = computeIdtBitmask(cv);
      expect(mask).toBe(1 << (cv - 15));
    }
  });

  it('card value 23 wraps to bit 0 (same as card value 15)', () => {
    expect(computeIdtBitmask(23)).toBe(computeIdtBitmask(15));
  });
});

describe('isIdtRowActive', () => {
  it('row 15 (WALK) is always active for any card value', () => {
    for (let cv = 15; cv <= 23; cv++) {
      expect(isIdtRowActive(0, cv)).toBe(true);
    }
  });

  it('row 22 (FLY_OUT) is gated for card values 16, 17, 18', () => {
    expect(isIdtRowActive(7, 16)).toBe(false); // bitmap 0x0E, mask 0x02
    expect(isIdtRowActive(7, 17)).toBe(false); // bitmap 0x0E, mask 0x04
    expect(isIdtRowActive(7, 18)).toBe(false); // bitmap 0x0E, mask 0x08
  });

  it('row 22 (FLY_OUT) is active for card values 15, 19-23', () => {
    expect(isIdtRowActive(7, 15)).toBe(true);
    for (let cv = 19; cv <= 23; cv++) {
      expect(isIdtRowActive(7, cv)).toBe(true);
    }
  });

  it('row 18 (SPECIAL_EVENT) is gated for card values 15, 17', () => {
    expect(isIdtRowActive(3, 15)).toBe(false); // bitmap 0x05, mask 0x01
    expect(isIdtRowActive(3, 17)).toBe(false); // bitmap 0x05, mask 0x04
  });

  it('row 18 (SPECIAL_EVENT) is active for card values 16, 18-22', () => {
    expect(isIdtRowActive(3, 16)).toBe(true);
    for (let cv = 18; cv <= 22; cv++) {
      expect(isIdtRowActive(3, cv)).toBe(true);
    }
    // Card value 23 wraps to bit 0 (same as 15), which IS gated
    expect(isIdtRowActive(3, 23)).toBe(false);
  });
});
