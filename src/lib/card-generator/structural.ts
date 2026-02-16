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
 * Power rating position (card[24]).
 * Per BBW reverse engineering: Position 24 always holds the extra-base power
 * rating (values 13-21). This is set separately from the outcome fill and is
 * excluded from the sequential allocation of outcome slots.
 */
export const POWER_POSITION = 24;

/**
 * Gate positions -- positions with fixed or near-fixed values in BBW.
 * From 828-card analysis:
 *   Position 0: value 13 (41%) or 14 (32%) -- primary outcome gate (walk/K)
 *   Position 15: value 33 (75%) -- power gate
 *   Position 20: value 14 (94%) -- strikeout gate
 * These are pre-set before the sequential outcome fill.
 */
export const GATE_POSITIONS: readonly number[] = [0, 15, 20];

/**
 * Archetype flag positions (bytes 33-34).
 * Per reverse engineering: "These final two bytes encode special player attributes"
 * (7,0)=standard RH, (1,0)=power, (6,0)=speed, etc.
 * These are metadata flags, not outcome positions -- excluded from PA draws.
 * The card generator sets them with archetype values after filling outcome slots.
 */
export const ARCHETYPE_POSITIONS: readonly number[] = [33, 34];

/**
 * Non-drawable positions during simulation PA draws.
 * Only structural constants are excluded -- archetype positions 33-34 ARE drawn
 * because Ghidra decompilation of FUN_1058_5f49 shows `iVar12 < 0x24` (positions 0-35),
 * which includes positions 33-34. Archetype byte values double as outcome values
 * (e.g., byte33=1 maps to HOME_RUN, byte34=0 maps to DOUBLE).
 *
 * This gives 26 drawable positions (35 - 9 structural).
 */
export const NON_DRAWABLE_POSITIONS: readonly number[] = [...STRUCTURAL_POSITIONS];

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
 * Check whether a 0-indexed position is non-drawable in simulation (structural constant only).
 */
export function isNonDrawablePosition(position: number): boolean {
  return nonDrawableSet.has(position);
}

/**
 * Number of drawable card positions in simulation (35 total - 9 structural = 26).
 * Confirmed by Ghidra: BBW draws from all non-structural positions including
 * archetype bytes 33-34.
 */
export const DRAWABLE_COUNT = CARD_LENGTH - NON_DRAWABLE_POSITIONS.length;

/**
 * Explicit constant for the proportional allocation model.
 * Used by the card generator to compute: count = round(rate * SIMULATION_DRAWABLE_COUNT).
 */
export const SIMULATION_DRAWABLE_COUNT = 26;

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
const gateSet = new Set(GATE_POSITIONS);

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

/**
 * Return the 20 outcome-fill positions (excludes structural + archetype + power + gates).
 * These are the positions filled by the sequential outcome allocation algorithm.
 * The excluded positions are pre-set:
 *   9 structural constants, 2 archetype flags, 1 power (pos 24), 3 gates (pos 0, 15, 20)
 *   = 15 excluded, 35 - 15 = 20 outcome positions
 */
export function getOutcomePositions(): number[] {
  const positions: number[] = [];
  for (let i = 0; i < CARD_LENGTH; i++) {
    if (!structuralSet.has(i) && !archetypeSet.has(i)
      && i !== POWER_POSITION && !gateSet.has(i)) {
      positions.push(i);
    }
  }
  return positions;
}

/**
 * Number of outcome-fill positions (35 - 9 structural - 2 archetype - 1 power - 3 gates = 20).
 */
export const OUTCOME_POSITION_COUNT = CARD_LENGTH
  - STRUCTURAL_POSITIONS.length
  - ARCHETYPE_POSITIONS.length
  - 1  // POWER_POSITION
  - GATE_POSITIONS.length;
