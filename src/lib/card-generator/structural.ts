import type { CardValue } from '../types';

/**
 * Card length per APBA BBW (35 bytes).
 */
export const CARD_LENGTH = 35;

/**
 * The 9 structural constant positions (0-indexed).
 * From reverse engineering analysis of 828 real APBA cards in PLAYERS.DAT:
 *   Position 1: value 30 (99.2%), Position 3: value 28 (88.8%),
 *   Position 6: value 27 (94.1%), Position 11: value 26 (94.8%),
 *   Position 13: value 31 (93.0%), Position 18: value 29 (93.2%),
 *   Position 23: value 25 (98.8%), Position 25: value 32 (99.4%),
 *   Position 32: value 35 (100%)
 * These positions are already 0-indexed (array indices into the 35-byte card).
 */
export const STRUCTURAL_POSITIONS: readonly number[] = [1, 3, 6, 11, 13, 18, 23, 25, 32];

/**
 * Archetype flag positions (bytes 33-34).
 * Per reverse engineering: "These final two bytes encode special player attributes"
 * (7,0)=standard RH, (1,0)=power, (6,0)=speed, etc.
 * These are metadata flags, not outcome positions -- excluded from PA draws.
 * The card generator sets them with archetype values after filling outcome slots.
 */
export const ARCHETYPE_POSITIONS: readonly number[] = [33, 34];

/**
 * All non-drawable positions during card draws.
 * Includes 9 structural constants + 2 archetype flag positions = 11 total.
 * Leaves 24 drawable outcome positions.
 */
export const NON_DRAWABLE_POSITIONS: readonly number[] = [...STRUCTURAL_POSITIONS, ...ARCHETYPE_POSITIONS];

/**
 * Map from 0-indexed position to structural constant value (REQ-DATA-005 Step 2).
 *
 * Verified against all 828 players in 1971S.WDD PLAYERS.DAT.
 */
export const STRUCTURAL_VALUES: ReadonlyMap<number, CardValue> = new Map([
  [1, 30],
  [3, 28],
  [6, 27],
  [11, 26],
  [13, 31],
  [18, 29],
  [23, 25],
  [25, 32],
  [32, 35],
]);

const structuralSet = new Set(STRUCTURAL_POSITIONS);
const nonDrawableSet = new Set(NON_DRAWABLE_POSITIONS);

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
 * Check whether a 0-indexed position is non-drawable (structural constant).
 */
export function isNonDrawablePosition(position: number): boolean {
  return nonDrawableSet.has(position);
}

/**
 * Number of drawable card positions (35 total - 11 non-drawable = 24).
 */
export const DRAWABLE_COUNT = CARD_LENGTH - NON_DRAWABLE_POSITIONS.length;

/**
 * Return the 26 non-structural variable positions, sorted ascending.
 * Includes archetype positions 33-34 (for card generation fill).
 * Excludes only the 9 structural constants.
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

const archetypeSet = new Set(ARCHETYPE_POSITIONS);

/**
 * Return the 24 fillable variable positions (excludes structural + archetype).
 * Used by the card generator to fill outcome values before archetype overwrite.
 */
export function getFillablePositions(): number[] {
  const positions: number[] = [];
  for (let i = 0; i < CARD_LENGTH; i++) {
    if (!structuralSet.has(i) && !archetypeSet.has(i)) {
      positions.push(i);
    }
  }
  return positions;
}
