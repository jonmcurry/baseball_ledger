/**
 * Roster Validation
 *
 * REQ-DFT-008: Post-draft roster composition validation.
 * REQ-RST-001: Every team must have exactly 21 players with specific
 * position requirements.
 *
 * Required roster:
 *   9 starters: C, 1B, 2B, SS, 3B, 3 OF (LF/CF/RF), DH
 *   4 bench position players
 *   4 SP (rotation)
 *   3 RP (bullpen)
 *   1 CL (closer)
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { Position } from '../types/player';
import type { DraftablePlayer } from './ai-strategy';
import { calculatePlayerValue } from './ai-valuation';

/** Total roster size per REQ-RST-001. */
export const REQUIRED_ROSTER_SIZE = 21;

/** Outfield positions that are interchangeable for starter slots. */
const OF_POSITIONS: Position[] = ['LF', 'CF', 'RF'];

/** Infield/other starter positions that must be filled individually. */
const INDIVIDUAL_STARTER_POSITIONS: Position[] = ['C', '1B', '2B', 'SS', '3B', 'DH'];

/** A gap in the roster that needs filling. */
export interface RosterGap {
  position: Position;
  slot: 'starter' | 'bench' | 'rotation' | 'bullpen' | 'closer';
}

/** Result of roster validation. */
export interface RosterValidationResult {
  valid: boolean;
  errors: string[];
  gaps: RosterGap[];
}

/**
 * Count how many players fill each position category on the roster.
 */
function countPositions(roster: DraftablePlayer[]): {
  startersFilled: Map<Position, number>;
  ofCount: number;
  spCount: number;
  rpCount: number;
  clCount: number;
  benchCount: number;
} {
  const startersFilled = new Map<Position, number>();
  let ofCount = 0;
  let spCount = 0;
  let rpCount = 0;
  let clCount = 0;
  let benchCount = 0;

  // Track which individual starter slots are filled
  const individualFilled = new Set<Position>();

  for (const entry of roster) {
    const card = entry.card;

    if (card.isPitcher && card.pitching) {
      switch (card.pitching.role) {
        case 'SP': spCount++; break;
        case 'RP': rpCount++; break;
        case 'CL': clCount++; break;
      }
    } else {
      const pos = card.primaryPosition;

      // Check if this player fills an individual starter slot
      if (INDIVIDUAL_STARTER_POSITIONS.includes(pos) && !individualFilled.has(pos)) {
        individualFilled.add(pos);
        startersFilled.set(pos, (startersFilled.get(pos) ?? 0) + 1);
      } else if (OF_POSITIONS.includes(pos) && ofCount < 3) {
        // Fill OF starter slots (need 3 total, any combination of LF/CF/RF)
        ofCount++;
      } else {
        // Excess position players go to bench
        benchCount++;
      }
    }
  }

  // Copy individual fills into the map
  return { startersFilled, ofCount, spCount, rpCount, clCount, benchCount };
}

/**
 * Get the list of roster gaps (unfilled positions).
 *
 * @param roster - Current roster entries
 * @returns Array of gaps that need filling
 */
export function getRosterGaps(roster: DraftablePlayer[]): RosterGap[] {
  const gaps: RosterGap[] = [];
  const counts = countPositions(roster);

  // Check individual starter positions
  for (const pos of INDIVIDUAL_STARTER_POSITIONS) {
    if (!counts.startersFilled.has(pos)) {
      gaps.push({ position: pos, slot: 'starter' });
    }
  }

  // Check OF (need 3 total)
  const ofNeeded = 3 - counts.ofCount;
  for (let i = 0; i < ofNeeded; i++) {
    // Assign specific OF positions to gaps for filling purposes
    const ofPos = OF_POSITIONS[i] ?? 'LF';
    gaps.push({ position: ofPos, slot: 'starter' });
  }

  // Check SP (need 4)
  const spNeeded = 4 - counts.spCount;
  for (let i = 0; i < spNeeded; i++) {
    gaps.push({ position: 'SP', slot: 'rotation' });
  }

  // Check RP (need 3)
  const rpNeeded = 3 - counts.rpCount;
  for (let i = 0; i < rpNeeded; i++) {
    gaps.push({ position: 'RP', slot: 'bullpen' });
  }

  // Check CL (need 1)
  if (counts.clCount < 1) {
    gaps.push({ position: 'CL', slot: 'closer' });
  }

  // Check bench (need 4)
  const benchNeeded = 4 - counts.benchCount;
  for (let i = 0; i < benchNeeded; i++) {
    gaps.push({ position: 'DH', slot: 'bench' });
  }

  return gaps;
}

/**
 * Validate that a roster meets all composition requirements.
 *
 * @param roster - The roster entries to validate
 * @returns Validation result with any errors and gaps
 */
export function validateRoster(roster: DraftablePlayer[]): RosterValidationResult {
  const errors: string[] = [];
  const gaps = getRosterGaps(roster);

  // Check total roster size
  if (roster.length !== REQUIRED_ROSTER_SIZE) {
    errors.push(
      `Roster has ${roster.length} players, expected ${REQUIRED_ROSTER_SIZE} (21)`,
    );
  }

  // Convert gaps to error messages
  for (const gap of gaps) {
    switch (gap.slot) {
      case 'starter':
        errors.push(`Missing starter: ${gap.position}`);
        break;
      case 'rotation':
        errors.push(`Missing SP in rotation`);
        break;
      case 'bullpen':
        errors.push(`Missing RP in bullpen`);
        break;
      case 'closer':
        errors.push(`Missing CL (closer)`);
        break;
      case 'bench':
        errors.push(`Missing bench position player`);
        break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    gaps,
  };
}

/**
 * Get player value for sorting during auto-fill.
 */
function getPlayerValue(player: DraftablePlayer): number {
  return calculatePlayerValue(player.card, { ops: player.ops, sb: player.sb });
}

/**
 * Auto-fill roster gaps from the available player pool.
 *
 * Per REQ-DFT-008: If any team is short after the draft, auto-fill
 * from the remaining player pool using best available at the needed position.
 *
 * @param roster - Current roster (may have gaps)
 * @param pool - Available players to fill from
 * @returns Updated roster with gaps filled where possible
 */
export function autoFillRoster(
  roster: DraftablePlayer[],
  pool: DraftablePlayer[],
): DraftablePlayer[] {
  const gaps = getRosterGaps(roster);
  if (gaps.length === 0) return [...roster];

  const filled = [...roster];
  const usedIds = new Set(roster.map((p) => p.card.playerId));

  for (const gap of gaps) {
    // Find best available player for this gap
    const candidates = pool
      .filter((p) => {
        if (usedIds.has(p.card.playerId)) return false;

        if (gap.slot === 'bench') {
          // Bench can be any position player
          return !p.card.isPitcher;
        }

        if (gap.slot === 'starter' && OF_POSITIONS.includes(gap.position)) {
          // OF gaps accept any OF player
          return !p.card.isPitcher && OF_POSITIONS.includes(p.card.primaryPosition);
        }

        // Direct position match
        if (p.card.isPitcher && p.card.pitching) {
          return p.card.pitching.role === gap.position;
        }
        return p.card.primaryPosition === gap.position;
      })
      .sort((a, b) => getPlayerValue(b) - getPlayerValue(a));

    if (candidates.length > 0) {
      const pick = candidates[0];
      filled.push(pick);
      usedIds.add(pick.card.playerId);
    }
  }

  return filled;
}
