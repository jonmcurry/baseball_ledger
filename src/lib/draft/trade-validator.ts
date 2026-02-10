/**
 * Trade Validation
 *
 * REQ-RST-005: Trade between two teams.
 * REQ-RST-006: Both rosters must remain valid after trade.
 *
 * Simulates the swap, then checks that both resulting rosters
 * meet composition requirements (21 players, correct positions).
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { RosterEntry } from '../types/roster';
import { REQUIRED_ROSTER_SIZE } from './roster-validator';

/** The positions required for roster starters. */
const REQUIRED_STARTERS = ['C', '1B', '2B', 'SS', '3B'] as const;
const OF_POSITIONS = ['LF', 'CF', 'RF'] as const;
const REQUIRED_OF_COUNT = 3;
const REQUIRED_SP = 4;
const REQUIRED_RP = 3;
const REQUIRED_CL = 1;

export interface TradeValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate that a trade between two teams preserves roster composition.
 *
 * @param rosterA - Full roster of team A
 * @param rosterB - Full roster of team B
 * @param playersFromA - Player IDs being sent from A to B
 * @param playersFromB - Player IDs being sent from B to A
 */
export function validateTradeRosters(
  rosterA: readonly RosterEntry[],
  rosterB: readonly RosterEntry[],
  playersFromA: readonly string[],
  playersFromB: readonly string[],
): TradeValidationResult {
  const errors: string[] = [];

  // Check for empty trade
  if (playersFromA.length === 0 && playersFromB.length === 0) {
    errors.push('Trade is empty: no players selected on either side');
    return { valid: false, errors };
  }

  // Check for duplicate players (same player on both sides)
  const fromASet = new Set(playersFromA);
  const fromBSet = new Set(playersFromB);
  for (const id of fromASet) {
    if (fromBSet.has(id)) {
      errors.push(`Player ${id} appears on both sides of the trade`);
    }
  }
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Verify all traded players actually exist in their respective rosters
  for (const id of playersFromA) {
    if (!rosterA.find((r) => r.playerId === id)) {
      errors.push(`Player ${id} is not on team A's roster`);
    }
  }
  for (const id of playersFromB) {
    if (!rosterB.find((r) => r.playerId === id)) {
      errors.push(`Player ${id} is not on team B's roster`);
    }
  }
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Simulate the swap
  const playersLeavingA = rosterA.filter((r) => fromASet.has(r.playerId));
  const playersLeavingB = rosterB.filter((r) => fromBSet.has(r.playerId));
  const newRosterA = [
    ...rosterA.filter((r) => !fromASet.has(r.playerId)),
    ...playersLeavingB,
  ];
  const newRosterB = [
    ...rosterB.filter((r) => !fromBSet.has(r.playerId)),
    ...playersLeavingA,
  ];

  // Validate both resulting rosters
  const errorsA = checkComposition(newRosterA, 'Team A');
  const errorsB = checkComposition(newRosterB, 'Team B');
  errors.push(...errorsA, ...errorsB);

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check roster composition rules for a single team.
 */
function checkComposition(roster: readonly RosterEntry[], teamLabel: string): string[] {
  const errors: string[] = [];

  // Size check
  if (roster.length !== REQUIRED_ROSTER_SIZE) {
    errors.push(
      `${teamLabel} would have ${roster.length} players, expected ${REQUIRED_ROSTER_SIZE} (21)`,
    );
  }

  // Count position players and pitchers
  let ofCount = 0;
  const filledStarters = new Set<string>();
  let spCount = 0;
  let rpCount = 0;
  let clCount = 0;

  for (const entry of roster) {
    const card = entry.playerCard;
    if (card.isPitcher && card.pitching) {
      switch (card.pitching.role) {
        case 'SP': spCount++; break;
        case 'RP': rpCount++; break;
        case 'CL': clCount++; break;
      }
    } else {
      const pos = card.primaryPosition;
      if ((REQUIRED_STARTERS as readonly string[]).includes(pos) && !filledStarters.has(pos)) {
        filledStarters.add(pos);
      } else if ((OF_POSITIONS as readonly string[]).includes(pos) && ofCount < REQUIRED_OF_COUNT) {
        ofCount++;
      }
    }
  }

  // Check required starters
  for (const pos of REQUIRED_STARTERS) {
    if (!filledStarters.has(pos)) {
      errors.push(`${teamLabel} would be missing starter: ${pos}`);
    }
  }

  // Check OF
  if (ofCount < REQUIRED_OF_COUNT) {
    errors.push(`${teamLabel} would have only ${ofCount} outfielders (need ${REQUIRED_OF_COUNT})`);
  }

  // Check pitching
  if (spCount < REQUIRED_SP) {
    errors.push(`${teamLabel} would have only ${spCount} SP (need ${REQUIRED_SP})`);
  }
  if (rpCount < REQUIRED_RP) {
    errors.push(`${teamLabel} would have only ${rpCount} RP (need ${REQUIRED_RP})`);
  }
  if (clCount < REQUIRED_CL) {
    errors.push(`${teamLabel} would be missing CL (closer)`);
  }

  return errors;
}
