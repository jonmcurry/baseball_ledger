/**
 * AI Draft Player Valuation
 *
 * REQ-DFT-007: AI player valuation score for ranking "best available"
 * during the draft.
 *
 * Batter formula:  ((OPS * 115) + (SB * 0.3) + (defenseRating * 15)) * positionMultiplier * paScale
 *                  where defenseRating = (range + arm) / 2, paScale = min(1.0, PA / 400)
 *                  positionMultiplier from best eligiblePosition scarcity (SS=1.15, C=1.12, DH=0.95)
 * SP formula:      ((4.50 - max(ERA,1.50)) * 25) + (K9 * 5) - (BB9 * 8) + (stamina * 3)
 *                  then scaled by min(1.0, IP / 150) when IP is available
 * RP/CL formula:   ((3.50 - max(ERA,1.50)) * 18) + (K9 * 5) - (BB9 * 8)
 *                  then scaled by min(1.0, IP / 60) when IP is available
 *
 * Layer 1: Pure logic, no I/O, deterministic.
 */

import type { PlayerCard, PitcherAttributes, Position } from '../types/player';

/** Position scarcity multipliers per REQ-DFT-007.
 * Multiplicative (not additive) so the bonus scales with player quality.
 * SS/C are hardest to fill, DH easiest. */
const POSITION_SCARCITY: Record<string, number> = {
  C: 1.12, SS: 1.15, CF: 1.08, '2B': 1.06, '3B': 1.04,
  RF: 1.03, LF: 1.02, '1B': 1.00, DH: 0.95,
  SP: 1.00, RP: 1.00, CL: 1.00,
};

/**
 * Get the position scarcity multiplier for a defensive position.
 */
export function getPositionMultiplier(position: Position): number {
  return POSITION_SCARCITY[position] ?? 1.00;
}

/**
 * Get the best (highest) scarcity multiplier from a list of eligible positions.
 */
export function getBestPositionMultiplier(positions: Position[]): number {
  if (positions.length === 0) return 1.00;
  return Math.max(...positions.map(pos => getPositionMultiplier(pos)));
}

/**
 * Get the eligible position with the highest scarcity multiplier.
 * Falls back to primaryPosition if eligiblePositions is empty.
 */
export function getBestEligiblePosition(
  eligiblePositions: Position[],
  primaryPosition: Position,
): Position {
  if (eligiblePositions.length === 0) return primaryPosition;
  let bestPos = eligiblePositions[0];
  let bestMult = getPositionMultiplier(bestPos);
  for (let i = 1; i < eligiblePositions.length; i++) {
    const mult = getPositionMultiplier(eligiblePositions[i]);
    if (mult > bestMult) {
      bestMult = mult;
      bestPos = eligiblePositions[i];
    }
  }
  return bestPos;
}

/**
 * Calculate batter value from raw stats.
 *
 * @param position - Primary defensive position (used for scarcity multiplier)
 * @param ops - On-base plus slugging
 * @param sb - Stolen bases count
 * @param defenseRating - Combined defensive ability (0-1), computed as (range + arm) / 2
 * @returns Valuation score
 */
export function calculateBatterValue(
  position: Position,
  ops: number,
  sb: number,
  defenseRating: number,
): number {
  const baseValue = (ops * 115) + (sb * 0.3) + (defenseRating * 15);
  return baseValue * getPositionMultiplier(position);
}

/** PA threshold for full batter credit. Below this, value is scaled proportionally. */
const BATTER_PA_THRESHOLD = 400;

/**
 * Compute PA scaling factor for batter valuation.
 *
 * Short-season outliers (September call-ups, injury-shortened seasons) get
 * proportionally reduced value. Full-season batters (400+ PA) get full credit.
 * PA is approximated as AB + BB when exact PA is unavailable.
 */
export function computePaScaleFactor(pa: number): number {
  return Math.min(1.0, pa / BATTER_PA_THRESHOLD);
}

/** ERA floor: prevents dead-ball era sub-1.50 ERAs from dominating valuation. */
const ERA_FLOOR = 1.50;

/** IP thresholds for full credit. Below this, value is scaled proportionally. */
const SP_IP_THRESHOLD = 150;
const RP_IP_THRESHOLD = 60;

/**
 * Calculate pitcher value from pitching attributes.
 *
 * SP:     ((4.50 - max(ERA,1.50)) * 25) + (K9 * 5) - (BB9 * 8) + (stamina * 3)
 * RP/CL:  ((3.50 - max(ERA,1.50)) * 18) + (K9 * 5) - (BB9 * 8)
 *
 * ERA is floored at 1.50 to prevent dead-ball era distortion.
 */
export function calculatePitcherValue(pitching: PitcherAttributes): number {
  const era = Math.max(ERA_FLOOR, pitching.era);
  if (pitching.role === 'SP') {
    return ((4.50 - era) * 25)
      + (pitching.k9 * 5)
      - (pitching.bb9 * 8)
      + (pitching.stamina * 3);
  }
  // RP and CL use the same formula
  return ((3.50 - era) * 18)
    + (pitching.k9 * 5)
    - (pitching.bb9 * 8);
}

/**
 * Compute IP scaling factor for pitcher valuation.
 *
 * Short-season outliers (2020 COVID, September call-ups) get proportionally
 * reduced value. Full-season pitchers (SP 150+ IP, RP 50+ IP) get full credit.
 */
export function computeIpScaleFactor(ip: number, role: string): number {
  const threshold = role === 'SP' ? SP_IP_THRESHOLD : RP_IP_THRESHOLD;
  return Math.min(1.0, ip / threshold);
}

/**
 * Calculate a player's draft value.
 *
 * For pitchers, uses the card's pitching attributes.
 * For batters, uses MLB stats from card or passed-in stats.
 * Falls back to card attributes (power, speed, contactRate) when stats unavailable.
 *
 * @param card - The player card
 * @param batterStats - Optional raw batting stats (overrides card.mlbBattingStats)
 * @returns Valuation score
 */
export function calculatePlayerValue(
  card: PlayerCard,
  batterStats?: { ops: number; sb: number },
): number {
  if (card.isPitcher && card.pitching) {
    let value = calculatePitcherValue(card.pitching);
    // Scale by IP to penalize short-season outliers
    if (card.mlbPitchingStats) {
      value *= computeIpScaleFactor(card.mlbPitchingStats.IP, card.pitching.role);
    }
    return value;
  }

  // Try passed-in stats first, then card's mlbBattingStats
  let ops = batterStats?.ops ?? 0;
  let sb = batterStats?.sb ?? 0;

  if (ops === 0 && card.mlbBattingStats) {
    ops = card.mlbBattingStats.OPS;
    sb = card.mlbBattingStats.SB;
  }

  // Fallback: derive approximate value from card attributes when no stats available
  // Handle undefined attributes (legacy cards may not have these fields)
  if (ops === 0) {
    const power = card.power ?? 0;
    const contactRate = card.contactRate ?? 0;
    const discipline = card.discipline ?? 0;
    const speed = card.speed ?? 0;

    // If card attributes are also missing/zero, use position-based baseline
    // This ensures differentiation even for completely legacy cards
    if (power === 0 && contactRate === 0 && discipline === 0) {
      // Use position scarcity as primary differentiator for legacy data
      // C/SS/CF are premium, corner infielders next, then OF/DH
      const positionValue: Record<string, number> = {
        C: 0.85, SS: 0.82, CF: 0.80, '2B': 0.78, '3B': 0.76,
        RF: 0.74, LF: 0.72, '1B': 0.70, DH: 0.68,
      };
      ops = positionValue[card.primaryPosition] ?? 0.70;
      sb = 10; // Assume average speed
    } else {
      // power (ISO) contributes to SLG, contactRate/discipline to OBP
      ops = 0.650 + (power * 0.5) + (contactRate * 0.15) + (discipline * 0.1);
      sb = Math.round(speed * 40); // speed of 1.0 ≈ 40 SB season
    }
  }

  // Defense rating from range + arm (0-1 scale each, averaged)
  // Provides real differentiation vs fieldingPct which is ~.950-1.000 for everyone
  const defenseRating = ((card.range ?? 0.5) + (card.arm ?? 0.5)) / 2;

  // Use the best scarcity multiplier from all eligible positions.
  // E.g., Vladimir Guerrero (1B/RF) gets RF's 1.03 instead of 1B's 1.00.
  const bestPosition = getBestEligiblePosition(card.eligiblePositions, card.primaryPosition);

  let value = calculateBatterValue(
    bestPosition,
    ops,
    sb,
    defenseRating,
  );

  // Scale by PA to penalize short-season outliers (mirrors pitcher IP scaling)
  if (card.mlbBattingStats) {
    const pa = card.mlbBattingStats.AB + card.mlbBattingStats.BB;
    value *= computePaScaleFactor(pa);
  }

  return value;
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
