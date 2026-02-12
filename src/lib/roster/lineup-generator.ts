/**
 * Lineup Generation
 *
 * REQ-RST-003: AI lineup generation algorithm.
 * REQ-RST-004: Lineup validation rules.
 *
 * Batting order assignment:
 *   #1 Leadoff: Highest OBP with speed > 0.5 (fallback: highest OBP)
 *   #2: Highest contact rate (among remaining)
 *   #3: Highest OPS overall (among remaining)
 *   #4: Highest SLG / cleanup (among remaining)
 *   #5-#7: Next highest OPS (among remaining)
 *   #8: Weakest hitter (lowest OPS among remaining)
 *   #9: Second weakest (remaining player)
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { PlayerCard, Position } from '../types/player';
import type { LineupSlot } from '../types/game';

/** Input for lineup generation: a player card paired with batting stats. */
export interface LineupInput {
  card: PlayerCard;
  ops: number;
  obp: number;
  slg: number;
}

/** Result of lineup validation. */
export interface LineupValidationResult {
  valid: boolean;
  errors: string[];
}

/** The 8 defensive positions that must each appear exactly once. */
const DEFENSIVE_POSITIONS: Position[] = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'];

/** The 3 outfield slots for distributing generic 'OF' players. */
const OUTFIELD_SLOTS: Position[] = ['LF', 'CF', 'RF'];

/** All 9 lineup positions (8 defensive + DH). */
const LINEUP_POSITIONS: Position[] = [...DEFENSIVE_POSITIONS, 'DH'];

/**
 * Assign defensive positions from the batting order.
 * Handles generic 'OF' players by distributing them across LF, CF, RF slots.
 */
function assignDefensivePositions(order: LineupInput[]): Position[] {
  const usedPositions = new Set<Position>();
  const assignments = new Map<number, Position>();

  // Pass 1: Assign players with specific non-OF, non-DH positions
  for (let i = 0; i < order.length; i++) {
    const pos = order[i].card.primaryPosition;
    if (pos !== 'OF' && pos !== 'DH' && !usedPositions.has(pos)) {
      assignments.set(i, pos);
      usedPositions.add(pos);
    }
  }

  // Pass 2: Assign OF players to open outfield slots (LF, CF, RF)
  for (let i = 0; i < order.length; i++) {
    if (assignments.has(i)) continue;
    const pos = order[i].card.primaryPosition;
    if (pos === 'OF') {
      const slot = OUTFIELD_SLOTS.find((s) => !usedPositions.has(s));
      if (slot) {
        assignments.set(i, slot);
        usedPositions.add(slot);
      }
    }
  }

  // Pass 3: Remaining unassigned players get DH
  for (let i = 0; i < order.length; i++) {
    if (!assignments.has(i)) {
      assignments.set(i, 'DH');
    }
  }

  return order.map((_, i) => assignments.get(i)!);
}

/**
 * Generate a 9-slot batting order from the starting 9 players.
 *
 * @param starters - Exactly 9 LineupInput entries (one per starting position)
 * @returns 9 LineupSlot entries in batting order (index 0 = leadoff)
 * @throws Error if not exactly 9 starters
 */
export function generateLineup(starters: LineupInput[]): LineupSlot[] {
  if (starters.length !== 9) {
    throw new Error(`Expected 9 starters, got ${starters.length}`);
  }

  const remaining = [...starters];
  const order: LineupInput[] = [];

  // #1 Leadoff: Highest OBP with speed > 0.5; fallback to highest OBP
  const leadoff = pickLeadoff(remaining);
  order.push(leadoff);
  removeFromArray(remaining, leadoff);

  // #2: Highest contact rate
  const second = pickByMax(remaining, (p) => p.card.contactRate);
  order.push(second);
  removeFromArray(remaining, second);

  // #3: Highest OPS overall
  const third = pickByMax(remaining, (p) => p.ops);
  order.push(third);
  removeFromArray(remaining, third);

  // #4: Highest SLG (cleanup)
  const fourth = pickByMax(remaining, (p) => p.slg);
  order.push(fourth);
  removeFromArray(remaining, fourth);

  // #8 and #9: Weakest two hitters (pick them now, place them later)
  const weakest = pickByMin(remaining, (p) => p.ops);
  removeFromArray(remaining, weakest);
  const secondWeakest = pickByMin(remaining, (p) => p.ops);
  removeFromArray(remaining, secondWeakest);

  // #5-#7: Remaining 3 players sorted by OPS descending
  remaining.sort((a, b) => b.ops - a.ops);
  order.push(...remaining);

  // #8 and #9
  order.push(weakest);
  order.push(secondWeakest);

  const positions = assignDefensivePositions(order);
  return order.map((input, i) => ({
    rosterId: input.card.playerId, // Layer 1 uses playerId as rosterId placeholder
    playerId: input.card.playerId,
    playerName: `${input.card.nameFirst} ${input.card.nameLast}`,
    position: positions[i],
  }));
}

/**
 * Pick the leadoff hitter: highest OBP among players with speed > 0.5.
 * Falls back to highest OBP if no one is fast enough.
 */
function pickLeadoff(candidates: LineupInput[]): LineupInput {
  const fast = candidates.filter((p) => p.card.speed > 0.5);
  if (fast.length > 0) {
    return pickByMax(fast, (p) => p.obp, (p) => p.card.speed);
  }
  // Fallback: highest OBP regardless of speed
  return pickByMax(candidates, (p) => p.obp, (p) => p.card.speed);
}

/**
 * Pick the player with the highest value of the given metric.
 * Uses tiebreaker function if provided.
 */
function pickByMax(
  candidates: LineupInput[],
  metric: (p: LineupInput) => number,
  tiebreaker?: (p: LineupInput) => number,
): LineupInput {
  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    const diff = metric(candidates[i]) - metric(best);
    if (diff > 0 || (diff === 0 && tiebreaker && tiebreaker(candidates[i]) > tiebreaker(best))) {
      best = candidates[i];
    }
  }
  return best;
}

/**
 * Pick the player with the lowest value of the given metric.
 */
function pickByMin(
  candidates: LineupInput[],
  metric: (p: LineupInput) => number,
): LineupInput {
  let worst = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (metric(candidates[i]) < metric(worst)) {
      worst = candidates[i];
    }
  }
  return worst;
}

/**
 * Remove a specific entry from an array (by reference).
 */
function removeFromArray(arr: LineupInput[], item: LineupInput): void {
  const idx = arr.indexOf(item);
  if (idx >= 0) arr.splice(idx, 1);
}

/**
 * Validate a lineup per REQ-RST-004.
 *
 * Rules:
 * - Exactly 9 batting slots
 * - Each defensive position filled exactly once (C, 1B, 2B, SS, 3B, LF, CF, RF)
 * - DH fills one slot
 */
export function validateLineup(lineup: LineupSlot[]): LineupValidationResult {
  const errors: string[] = [];

  if (lineup.length !== 9) {
    errors.push(`Lineup must have exactly 9 slots, got ${lineup.length}`);
  }

  // Check for duplicate positions
  const positionCounts = new Map<string, number>();
  for (const slot of lineup) {
    positionCounts.set(slot.position, (positionCounts.get(slot.position) ?? 0) + 1);
  }

  for (const [pos, count] of positionCounts) {
    if (count > 1) {
      errors.push(`Duplicate position: ${pos} appears ${count} times`);
    }
  }

  // Check all required positions are present
  for (const pos of LINEUP_POSITIONS) {
    if (!positionCounts.has(pos)) {
      errors.push(`Missing required position: ${pos}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
