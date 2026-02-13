/**
 * Composition Guard
 *
 * REQ-DFT-008: Prevents human picks that would make valid roster
 * composition impossible.
 *
 * Checks whether adding a proposed pick would leave enough remaining
 * picks to fill all mandatory positions (starters, rotation, bullpen).
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { DraftablePlayer } from './ai-strategy';
import { getRosterNeeds } from './ai-strategy';

/** Result of a composition guard check. */
export interface CompositionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check whether a proposed draft pick would make valid roster
 * composition impossible.
 *
 * After hypothetically adding the proposed pick, computes mandatory
 * needs (starters, rotation, bullpen -- everything except bench).
 * If mandatory needs exceed remaining picks, the pick is rejected.
 *
 * @param currentRoster - Current team roster (picks made so far)
 * @param proposedPick - The player the human wants to draft
 * @param totalRosterSize - Total roster slots (default 21)
 * @returns Whether the pick is allowed, with reason if not
 */
export function wouldViolateComposition(
  currentRoster: DraftablePlayer[],
  proposedPick: DraftablePlayer,
  totalRosterSize: number = 21,
): CompositionCheckResult {
  // Hypothetical roster after adding this pick
  const hypothetical = [...currentRoster, proposedPick];
  const needs = getRosterNeeds(hypothetical);
  const mandatoryNeeds = needs.filter((n) => n.slot !== 'bench');
  const remainingPicks = totalRosterSize - hypothetical.length;

  if (mandatoryNeeds.length > remainingPicks) {
    const missing = mandatoryNeeds.map((n) => n.position).join(', ');
    return {
      allowed: false,
      reason: `Picking this player would make it impossible to fill mandatory positions: ${missing}. You have ${remainingPicks} pick(s) remaining but need ${mandatoryNeeds.length} mandatory position(s).`,
    };
  }

  return { allowed: true };
}
