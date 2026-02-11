import type { CardValue } from '../types';

/**
 * Card length per APBA BBW (35 bytes).
 */
export const CARD_LENGTH = 35;

/**
 * The 9 structural constant positions (0-indexed).
 * SRD uses 1-indexed (1,3,6,11,13,18,23,25,32), we subtract 1 for array indices.
 */
export const STRUCTURAL_POSITIONS: readonly number[] = [0, 2, 5, 10, 12, 17, 22, 24, 31];

/**
 * Map from 0-indexed position to structural constant value (REQ-DATA-005 Step 2).
 *
 * SRD specification:
 *   card[1]=30, card[3]=28, card[6]=27, card[11]=26, card[13]=31,
 *   card[18]=29, card[23]=25, card[25]=32, card[32]=35
 */
export const STRUCTURAL_VALUES: ReadonlyMap<number, CardValue> = new Map([
  [0, 30],
  [2, 28],
  [5, 27],
  [10, 26],
  [12, 31],
  [17, 29],
  [22, 25],
  [24, 32],
  [31, 35],
]);

const structuralSet = new Set(STRUCTURAL_POSITIONS);

/**
 * Apply the 9 structural constants to a 35-element card array.
 * Mutates and returns the array.
 */
export function applyStructuralConstants(card: CardValue[]): CardValue[] {
  for (const [pos, value] of STRUCTURAL_VALUES) {
    card[pos] = value;
  }
  return card;
}

/**
 * Check whether a 0-indexed position is a structural constant.
 */
export function isStructuralPosition(position: number): boolean {
  return structuralSet.has(position);
}

/**
 * Return the 26 variable (non-structural) positions, sorted ascending.
 */
export function getVariablePositions(): number[] {
  const positions: number[] = [];
  for (let i = 0; i < CARD_LENGTH; i++) {
    if (!structuralSet.has(i)) {
      positions.push(i);
    }
  }
  return positions;
}
