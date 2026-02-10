/**
 * Derived Statistics Calculator
 *
 * REQ-STS-002: Compute derived statistics from base stat accumulators.
 *
 * Formulas:
 *   BA  = H / AB
 *   OBP = (H + BB + HBP) / (AB + BB + HBP + SF)
 *   SLG = (1B + 2B*2 + 3B*3 + HR*4) / AB
 *   OPS = OBP + SLG
 *   ERA = ER * 9 / IP
 *   WHIP = (BB + H) / IP
 *   K/9 = SO * 9 / IP
 *   BB/9 = BB * 9 / IP
 *   FIP = ((13*HR) + (3*(BB+HBP)) - (2*SO)) / IP + 3.15
 *
 * IP uses baseball convention: .1 = 1/3 inning, .2 = 2/3 inning.
 *
 * Layer 1: Pure logic, no I/O, deterministic.
 */

import type { BattingStats, PitchingStats } from '../types/stats';

/**
 * Convert baseball IP notation to true decimal.
 * In baseball, 6.1 = 6 and 1/3 innings, 6.2 = 6 and 2/3.
 */
export function ipToDecimal(ip: number): number {
  const whole = Math.floor(ip);
  const thirds = Math.round((ip - whole) * 10);
  return whole + thirds / 3;
}

/**
 * Add two IP values with proper thirds carry.
 * 6.2 + 0.1 = 7.0 (not 6.3).
 */
export function addIP(a: number, b: number): number {
  const aWhole = Math.floor(a);
  const aThirds = Math.round((a - aWhole) * 10);
  const bWhole = Math.floor(b);
  const bThirds = Math.round((b - bWhole) * 10);

  let totalThirds = aThirds + bThirds;
  let totalWhole = aWhole + bWhole;

  totalWhole += Math.floor(totalThirds / 3);
  totalThirds = totalThirds % 3;

  return totalWhole + totalThirds / 10;
}

/**
 * Compute batting average. Returns 0 if AB === 0.
 */
export function computeBA(h: number, ab: number): number {
  if (ab === 0) return 0;
  return h / ab;
}

/**
 * Compute on-base percentage.
 * OBP = (H + BB + HBP) / (AB + BB + HBP + SF)
 */
export function computeOBP(
  h: number,
  bb: number,
  hbp: number,
  ab: number,
  sf: number,
): number {
  const denom = ab + bb + hbp + sf;
  if (denom === 0) return 0;
  return (h + bb + hbp) / denom;
}

/**
 * Compute slugging percentage.
 * SLG = (1B + 2B*2 + 3B*3 + HR*4) / AB
 */
export function computeSLG(
  h: number,
  doubles: number,
  triples: number,
  hr: number,
  ab: number,
): number {
  if (ab === 0) return 0;
  const singles = h - doubles - triples - hr;
  const totalBases = singles + doubles * 2 + triples * 3 + hr * 4;
  return totalBases / ab;
}

/**
 * Compute OPS = OBP + SLG.
 */
export function computeOPS(obp: number, slg: number): number {
  return obp + slg;
}

/**
 * Compute ERA = ER * 9 / IP.
 * IP is in baseball notation; converted to decimal internally.
 */
export function computeERA(er: number, ip: number): number {
  const decimalIP = ipToDecimal(ip);
  if (decimalIP === 0) return 0;
  return (er * 9) / decimalIP;
}

/**
 * Compute WHIP = (BB + H) / IP.
 */
export function computeWHIP(bb: number, h: number, ip: number): number {
  const decimalIP = ipToDecimal(ip);
  if (decimalIP === 0) return 0;
  return (bb + h) / decimalIP;
}

/**
 * Compute K/9 = SO * 9 / IP.
 */
export function computeK9(so: number, ip: number): number {
  const decimalIP = ipToDecimal(ip);
  if (decimalIP === 0) return 0;
  return (so * 9) / decimalIP;
}

/**
 * Compute BB/9 = BB * 9 / IP.
 */
export function computeBB9(bb: number, ip: number): number {
  const decimalIP = ipToDecimal(ip);
  if (decimalIP === 0) return 0;
  return (bb * 9) / decimalIP;
}

/**
 * Compute FIP (Fielding Independent Pitching).
 * FIP = ((13*HR) + (3*(BB+HBP)) - (2*SO)) / IP + 3.15
 *
 * REQ-STS-005: Advanced pitching metric.
 */
export function computeFIP(
  hr: number,
  bb: number,
  hbp: number,
  so: number,
  ip: number,
): number {
  const decimalIP = ipToDecimal(ip);
  if (decimalIP === 0) return 0;
  return ((13 * hr) + (3 * (bb + hbp)) - (2 * so)) / decimalIP + 3.15;
}

/**
 * Apply all derived fields to a BattingStats object.
 * Returns a new object with BA, OBP, SLG, OPS computed.
 */
export function computeDerivedBatting(stats: BattingStats): BattingStats {
  const ba = computeBA(stats.H, stats.AB);
  const obp = computeOBP(stats.H, stats.BB, stats.HBP, stats.AB, stats.SF);
  const slg = computeSLG(stats.H, stats.doubles, stats.triples, stats.HR, stats.AB);
  const ops = computeOPS(obp, slg);
  return { ...stats, BA: ba, OBP: obp, SLG: slg, OPS: ops };
}

/**
 * Apply all derived fields to a PitchingStats object.
 * Returns a new object with ERA, WHIP, FIP computed.
 */
export function computeDerivedPitching(stats: PitchingStats): PitchingStats {
  const era = computeERA(stats.ER, stats.IP);
  const whip = computeWHIP(stats.BB, stats.H, stats.IP);
  const fip = computeFIP(stats.HR, stats.BB, stats.HBP, stats.SO, stats.IP);
  return { ...stats, ERA: era, WHIP: whip, FIP: fip };
}
