/**
 * Archetype Modifier Module
 *
 * REQ-SIM-004 Step 6: Applies archetype-based bonuses after outcome determination.
 *
 * Archetype effects:
 * - Power (1,0)/(1,1): +15% chance to upgrade FLY_OUT to HOME_RUN
 * - Speed (6,0): Flags stolen base opportunity on singles/walks
 * - Contact+Speed (0,2): -20% chance to downgrade strikeouts to GROUND_OUT
 * - Elite defense (8,0): No batting modifier
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

const STRIKEOUT_OUTCOMES: ReadonlySet<OutcomeCategory> = new Set([
  OutcomeCategory.STRIKEOUT_LOOKING,
  OutcomeCategory.STRIKEOUT_SWINGING,
]);

/** Power bonus probability: 15% chance FLY_OUT -> HOME_RUN */
const POWER_HR_UPGRADE_CHANCE = 0.15;

/** Contact bonus probability: 20% chance strikeout -> GROUND_OUT */
const CONTACT_K_DOWNGRADE_CHANCE = 0.20;

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
 * @param outcome - The determined OutcomeCategory
 * @param archetype - The batter's archetype flags (bytes 33-34)
 * @param rng - Seeded random number generator
 * @returns Modified outcome with metadata
 */
export function applyArchetypeModifier(
  outcome: OutcomeCategory,
  archetype: PlayerArchetype,
  rng: SeededRNG,
): ArchetypeModifierResult {
  // Power archetype: +15% HR on FLY_OUT
  if (isPowerArchetype(archetype)) {
    if (outcome === OutcomeCategory.FLY_OUT && rng.chance(POWER_HR_UPGRADE_CHANCE)) {
      return {
        outcome: OutcomeCategory.HOME_RUN,
        modified: true,
        modifierType: 'power',
        triggerStolenBaseCheck: false,
      };
    }
    return noModification(outcome);
  }

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

  // Contact+Speed archetype: -20% strikeout probability
  if (isContactSpeedArchetype(archetype)) {
    if (STRIKEOUT_OUTCOMES.has(outcome) && rng.chance(CONTACT_K_DOWNGRADE_CHANCE)) {
      return {
        outcome: OutcomeCategory.GROUND_OUT,
        modified: true,
        modifierType: 'contact',
        triggerStolenBaseCheck: false,
      };
    }
    return noModification(outcome);
  }

  // All other archetypes (elite defense, standard, pitcher, utility): no modifier
  return noModification(outcome);
}
