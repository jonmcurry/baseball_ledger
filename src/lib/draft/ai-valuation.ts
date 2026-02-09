/**
 * AI Draft Player Valuation
 *
 * REQ-DFT-007: AI player valuation score for ranking "best available"
 * during the draft.
 *
 * Batter formula:  (OPS * 100) + (SB * 0.5) + (fieldingPct * 20) + positionBonus
 * SP formula:      ((4.50 - ERA) * 30) + (K9 * 5) - (BB9 * 8) + (stamina * 3)
 * RP/CL formula:   ((3.50 - ERA) * 25) + (K9 * 6) - (BB9 * 10)
 *
 * Layer 1: Pure logic, no I/O, deterministic.
 */

import type { PlayerCard, PitcherAttributes, Position } from '../types/player';

/** Position bonus values per REQ-DFT-007. */
const POSITION_BONUSES: Record<string, number> = {
  C: 15, SS: 12, CF: 10, '2B': 8, '3B': 5,
  RF: 3, LF: 2, '1B': 1, DH: 0,
  SP: 0, RP: 0, CL: 0,
};

/**
 * Get the position bonus for a defensive position.
 */
export function getPositionBonus(position: Position): number {
  return POSITION_BONUSES[position] ?? 0;
}

/**
 * Calculate batter value from raw stats.
 *
 * @param position - Primary defensive position
 * @param ops - On-base plus slugging
 * @param sb - Stolen bases count
 * @param fieldingPct - Fielding percentage (0-1)
 * @returns Valuation score
 */
export function calculateBatterValue(
  position: Position,
  ops: number,
  sb: number,
  fieldingPct: number,
): number {
  return (ops * 100) + (sb * 0.5) + (fieldingPct * 20) + getPositionBonus(position);
}

/**
 * Calculate pitcher value from pitching attributes.
 *
 * SP:     ((4.50 - ERA) * 30) + (K9 * 5) - (BB9 * 8) + (stamina * 3)
 * RP/CL:  ((3.50 - ERA) * 25) + (K9 * 6) - (BB9 * 10)
 */
export function calculatePitcherValue(pitching: PitcherAttributes): number {
  if (pitching.role === 'SP') {
    return ((4.50 - pitching.era) * 30)
      + (pitching.k9 * 5)
      - (pitching.bb9 * 8)
      + (pitching.stamina * 3);
  }
  // RP and CL use the same formula
  return ((3.50 - pitching.era) * 25)
    + (pitching.k9 * 6)
    - (pitching.bb9 * 10);
}

/**
 * Calculate a player's draft value.
 *
 * For pitchers, uses the card's pitching attributes.
 * For batters, requires raw OPS and SB stats (not stored on PlayerCard).
 *
 * @param card - The player card
 * @param batterStats - Raw batting stats needed for batter valuation
 * @returns Valuation score, or 0 if insufficient data
 */
export function calculatePlayerValue(
  card: PlayerCard,
  batterStats?: { ops: number; sb: number },
): number {
  if (card.isPitcher && card.pitching) {
    return calculatePitcherValue(card.pitching);
  }
  if (!batterStats) return 0;
  return calculateBatterValue(
    card.primaryPosition,
    batterStats.ops,
    batterStats.sb,
    card.fieldingPct,
  );
}

/**
 * Select the best season for a player across multiple season cards.
 *
 * Per REQ-DFT-001a, when multiple seasons of the same physical player
 * are available, the AI selects the season with the highest valuation.
 *
 * @param cards - Cards for the same playerID across different seasons
 * @param statsMap - Map of "playerId_seasonYear" -> {ops, sb} for batters
 * @returns The card with the highest valuation
 */
export function selectBestSeason(
  cards: PlayerCard[],
  statsMap: Map<string, { ops: number; sb: number }>,
): PlayerCard {
  let bestCard = cards[0];
  let bestValue = -Infinity;

  for (const card of cards) {
    const key = `${card.playerId}_${card.seasonYear}`;
    const stats = statsMap.get(key);
    const value = calculatePlayerValue(card, stats);
    if (value > bestValue) {
      bestValue = value;
      bestCard = card;
    }
  }

  return bestCard;
}
