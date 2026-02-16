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
  extractDataSegment,
  extractVarianceTable,
  extractIdtWeights,
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
