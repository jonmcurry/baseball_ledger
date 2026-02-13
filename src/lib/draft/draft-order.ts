/**
 * Draft Order & Snake Logic
 *
 * REQ-DFT-001: 21-round snake draft.
 * REQ-DFT-002: Randomized order, reverses each round.
 *
 * In a snake draft:
 *   Round 1: Team A, B, C, D (forward)
 *   Round 2: Team D, C, B, A (reversed)
 *   Round 3: Team A, B, C, D (forward)
 *   ...and so on.
 *
 * Layer 1: Pure logic, no I/O, deterministic given inputs.
 */

import type { SeededRNG } from '../rng/seeded-rng';

/**
 * Total draft rounds per REQ-DFT-001:
 * 9 starters + 4 bench + 4 SP + 4 RP = 21
 */
export const TOTAL_ROUNDS = 21;

/**
 * Check if a round uses reversed (snake) order.
 * Odd rounds = forward, even rounds = reversed.
 */
export function isSnakeReversed(round: number): boolean {
  return round % 2 === 0;
}

/**
 * Generate a randomized draft order using Fisher-Yates shuffle.
 *
 * @param teamIds - Array of team IDs
 * @param rng - Seeded RNG for determinism
 * @returns Shuffled array of team IDs (round 1 order)
 */
export function generateDraftOrder(teamIds: string[], rng: SeededRNG): string[] {
  const order = [...teamIds];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng.nextFloat() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * Get the team picking at a specific round and pick number.
 *
 * @param round - 1-based round number
 * @param pick - 1-based pick within the round
 * @param draftOrder - The base (round 1) draft order
 * @returns Team ID of the picking team
 */
export function getPickingTeam(
  round: number,
  pick: number,
  draftOrder: string[],
): string {
  const idx = pick - 1; // 0-based index
  if (isSnakeReversed(round)) {
    return draftOrder[draftOrder.length - 1 - idx];
  }
  return draftOrder[idx];
}

/**
 * Get the next pick position after the current one.
 *
 * @param round - Current 1-based round
 * @param pick - Current 1-based pick within the round
 * @param totalRounds - Total rounds in the draft
 * @param teamCount - Number of teams
 * @returns Next {round, pick} or null if draft is complete
 */
export function getNextPick(
  round: number,
  pick: number,
  totalRounds: number,
  teamCount: number,
): { round: number; pick: number } | null {
  if (pick < teamCount) {
    return { round, pick: pick + 1 };
  }
  if (round < totalRounds) {
    return { round: round + 1, pick: 1 };
  }
  return null;
}
