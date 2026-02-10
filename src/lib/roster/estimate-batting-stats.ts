/**
 * Batting Stats Estimator
 *
 * Approximates OPS/OBP/SLG from PlayerCard derived fields for lineup ordering.
 * Only relative ordering matters -- exact values are not needed since the
 * lineup generator uses these for comparison/ranking, not absolute thresholds.
 *
 * Card fields used:
 *   contactRate: 1 - (SO/PA), range ~0.6-0.9
 *   power: ISO = SLG - BA, range ~0.02-0.30
 *   discipline: BB/K ratio scaled 0-1
 *
 * Layer 1: Pure logic, no I/O, deterministic.
 */

import type { PlayerCard } from '../types/player';

/**
 * Estimate OBP, SLG, and OPS from a PlayerCard's derived fields.
 *
 * @param card - PlayerCard with contactRate, power, and discipline fields
 * @returns Estimated { ops, obp, slg } for lineup ordering
 */
export function estimateBattingStats(card: PlayerCard): {
  ops: number;
  obp: number;
  slg: number;
} {
  // Approximate BA from contact rate (scaled down from 0-1 to realistic BA range)
  const ba = card.contactRate * 0.30;

  // SLG = BA + ISO (power = ISO = SLG - BA)
  const slg = ba + card.power;

  // OBP = BA + walk contribution (discipline scaled to walk rate contribution)
  const obp = ba + card.discipline * 0.10;

  // OPS = OBP + SLG
  const ops = obp + slg;

  return { ops, obp, slg };
}
