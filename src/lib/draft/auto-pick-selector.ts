/**
 * Auto-Pick Selector
 *
 * REQ-DFT-004: When a player's pick timer expires, the AI selects the
 * best available player using APBA card value scoring.
 *
 * Scoring uses known APBA correlations:
 *   Card value 1 (HR, r=.715): 15 points
 *   Card value 0 (double):      8 points
 *   Card values 7/8/9 (singles): 5 points each
 *   Card value 13 (walk, r=.978): 4 points
 *   Card value 14 (K, r=.959):   -3 points
 *   Power rating bonus: (powerRating - 13) * 3  (0 to 24 pts)
 *   Pitcher: pitching.grade * 10
 *
 * Layer 1: Pure logic, no I/O, deterministic.
 */

import type { PlayerCard } from '../types/player';

/** Weights for APBA card outcome values. */
const VALUE_WEIGHTS: Record<number, number> = {
  1: 15,  // HR
  0: 8,   // double
  7: 5,   // single
  8: 5,   // single
  9: 5,   // single
  13: 4,  // walk
  14: -3, // strikeout
};

/**
 * Structural constant positions in the 35-byte APBA card (0-indexed).
 * These positions are always the same value and should be skipped.
 */
const STRUCTURAL_POSITIONS = new Set([0, 2, 5, 10, 12, 17, 22, 24, 31]);

/**
 * Score a single player card for auto-pick ranking.
 */
function scoreCard(card: PlayerCard): number {
  if (card.isPitcher && card.pitching) {
    return card.pitching.grade * 10;
  }

  let score = 0;
  const values = card.card ?? [];
  for (let i = 0; i < values.length; i++) {
    if (STRUCTURAL_POSITIONS.has(i)) continue;
    const weight = VALUE_WEIGHTS[values[i]];
    if (weight !== undefined) {
      score += weight;
    }
  }

  // Power rating bonus: 13 (none) to 21 (excellent)
  score += ((card.powerRating ?? 13) - 13) * 3;

  return score;
}

/**
 * Select the best available player from a pool by APBA card scoring.
 *
 * @param players Array of objects with a `playerCard` field
 * @returns Index of the highest-scored player, or -1 if empty
 */
export function selectBestAvailable(
  players: ReadonlyArray<{ playerCard: PlayerCard }>,
): number {
  if (players.length === 0) return -1;

  let bestIndex = 0;
  let bestScore = scoreCard(players[0].playerCard);

  for (let i = 1; i < players.length; i++) {
    const score = scoreCard(players[i].playerCard);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}
