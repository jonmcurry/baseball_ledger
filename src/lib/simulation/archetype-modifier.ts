/**
 * Archetype Modifier Module
 *
 * REQ-SIM-004 Step 6: Applies archetype-based bonuses after outcome determination.
 *
 * Ghidra decompilation of FUN_1058_5f49 confirms archetype flags are a bitfield
 * at game object offset 0x44:
 *   &0x01 = speed
 *   &0x02 = power
 *   &0x04 = contact
 *   &0x08 = defense
 *
 * These flags are used for pitcher card symbol outcomes (values 43-48):
 *   43 (+): (speed|power) &0x03 != 0 -> hit
 *   44 (,): speed &0x01 != 0 -> hit
 *   45 (-): power &0x02 != 0 -> hit
 *   46 (.): (contact|defense) &0x0C != 0 -> out
 *   47 (/): defense &0x08 != 0 -> out
 *   48 (0): contact &0x04 != 0 -> out
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { PlayerArchetype } from '../types/player';
import type { SeededRNG } from '../rng/seeded-rng';
import { OutcomeCategory } from '../types/game';

/**
 * Result of applying an archetype modifier to an outcome.
 */
export interface ArchetypeModifierResult {
  outcome: OutcomeCategory;
  modified: boolean;
  modifierType: 'power' | 'speed' | 'contact' | null;
  triggerStolenBaseCheck: boolean;
}

// ---------------------------------------------------------------------------
// Archetype bitfield flags (Ghidra confirmed, offset 0x44)
// ---------------------------------------------------------------------------

/** Speed flag (bitfield &0x01). Archetype (6,0). */
export const ARCHETYPE_SPEED = 0x01;

/** Power flag (bitfield &0x02). Archetype (1,0)/(1,1). */
export const ARCHETYPE_POWER = 0x02;

/** Contact flag (bitfield &0x04). Archetype (0,2). */
export const ARCHETYPE_CONTACT = 0x04;

/** Defense flag (bitfield &0x08). Archetype (8,0). */
export const ARCHETYPE_DEFENSE = 0x08;

/**
 * Convert byte33/byte34 archetype pair to bitfield flags.
 *
 * Mapping (from APBA card byte analysis + Ghidra offset 0x44):
 *   (6,0) speed      -> 0x01
 *   (1,0) power      -> 0x02
 *   (1,1) power+plat -> 0x02
 *   (0,2) contact+sb -> 0x04 | 0x01 (contact + speed)
 *   (8,0) defense    -> 0x08
 *   (7,0) standard   -> 0x00
 *   (0,1) standard L -> 0x00
 *   (5,0) utility    -> 0x00
 *   (0,6) pitcher    -> 0x00
 */
export function computeArchetypeFlags(archetype: PlayerArchetype): number {
  const { byte33, byte34 } = archetype;

  // Speed specialist: (6,0)
  if (byte33 === 6 && byte34 === 0) return ARCHETYPE_SPEED;

  // Power hitter: (1,0) or (1,1)
  if (byte33 === 1 && (byte34 === 0 || byte34 === 1)) return ARCHETYPE_POWER;

  // Contact + speed: (0,2)
  if (byte33 === 0 && byte34 === 2) return ARCHETYPE_CONTACT | ARCHETYPE_SPEED;

  // Elite defense: (8,0)
  if (byte33 === 8 && byte34 === 0) return ARCHETYPE_DEFENSE;

  // All others: no flags
  return 0x00;
}

// ---------------------------------------------------------------------------
// Archetype detection helpers
// ---------------------------------------------------------------------------

/**
 * Check if archetype is power hitter: (1,0) or (1,1).
 */
export function isPowerArchetype(archetype: PlayerArchetype): boolean {
  return archetype.byte33 === 1 && (archetype.byte34 === 0 || archetype.byte34 === 1);
}

/**
 * Check if archetype is speed specialist: (6,0).
 */
export function isSpeedArchetype(archetype: PlayerArchetype): boolean {
  return archetype.byte33 === 6 && archetype.byte34 === 0;
}

/**
 * Check if archetype is contact+speed: (0,2).
 */
export function isContactSpeedArchetype(archetype: PlayerArchetype): boolean {
  return archetype.byte33 === 0 && archetype.byte34 === 2;
}

// ---------------------------------------------------------------------------
// Outcome checks
// ---------------------------------------------------------------------------

const SINGLE_OR_WALK_OUTCOMES: ReadonlySet<OutcomeCategory> = new Set([
  OutcomeCategory.SINGLE_CLEAN,
  OutcomeCategory.SINGLE_ADVANCE,
  OutcomeCategory.WALK,
  OutcomeCategory.WALK_INTENTIONAL,
  OutcomeCategory.HIT_BY_PITCH,
]);

// ---------------------------------------------------------------------------
// Main modifier function
// ---------------------------------------------------------------------------

function noModification(outcome: OutcomeCategory): ArchetypeModifierResult {
  return {
    outcome,
    modified: false,
    modifierType: null,
    triggerStolenBaseCheck: false,
  };
}

/**
 * Apply archetype modifier to a plate appearance outcome.
 *
 * Called after outcome determination (step 5) per REQ-SIM-004 step 6.
 *
 * With the SERD 5-column card system, power and contact bonuses are baked
 * into the card itself (via PlayerRates -> column multipliers). Only the
 * speed SB opportunity flag remains as a runtime modifier.
 *
 * @param outcome - The determined OutcomeCategory
 * @param archetype - The batter's archetype flags (bytes 33-34)
 * @param _rng - Seeded random number generator (unused in SERD mode)
 * @returns Modified outcome with metadata
 */
export function applyArchetypeModifier(
  outcome: OutcomeCategory,
  archetype: PlayerArchetype,
  _rng: SeededRNG,
): ArchetypeModifierResult {
  // Speed archetype: flag SB opportunity on singles/walks
  if (isSpeedArchetype(archetype)) {
    if (SINGLE_OR_WALK_OUTCOMES.has(outcome)) {
      return {
        outcome,
        modified: false,
        modifierType: 'speed',
        triggerStolenBaseCheck: true,
      };
    }
    return noModification(outcome);
  }

  // All other archetypes: no runtime modifier (power/contact baked into card)
  return noModification(outcome);
}
