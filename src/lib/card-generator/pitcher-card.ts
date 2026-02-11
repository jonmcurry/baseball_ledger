import type { CardValue, PitcherAttributes } from '../types';
import type { PitchingStats } from '../types';
import { getVariablePositions, CARD_LENGTH } from './structural';
import { applyStructuralConstants } from './structural';
import { CARD_VALUES } from './value-mapper';
import { computePitcherGrade } from './pitcher-grade';

/**
 * Generate a pitcher's batting card (REQ-DATA-005 Step 6).
 *
 * Pitchers' batting cards are flooded with value 13 (walk).
 * Per SRD: 14-18 of 26 variable positions get value 13,
 * 3-5 get value 14 (strikeout), remaining get out types.
 * Power rating at position 24 = 13 (no power -- handled by structural constant overwrite).
 */
export function generatePitcherBattingCard(): CardValue[] {
  const card = new Array(CARD_LENGTH).fill(0);
  applyStructuralConstants(card);

  const variablePositions = getVariablePositions();
  const WALK_COUNT = 16;      // middle of 14-18 range
  const STRIKEOUT_COUNT = 4;  // middle of 3-5 range

  let posIdx = 0;

  // Fill walks (value 13)
  for (let i = 0; i < WALK_COUNT && posIdx < variablePositions.length; i++) {
    card[variablePositions[posIdx++]] = CARD_VALUES.WALK;
  }

  // Fill strikeouts (value 14)
  for (let i = 0; i < STRIKEOUT_COUNT && posIdx < variablePositions.length; i++) {
    card[variablePositions[posIdx++]] = CARD_VALUES.STRIKEOUT;
  }

  // Fill remaining with out types (rotating through out values)
  const outValues = [CARD_VALUES.OUT_GROUND, CARD_VALUES.OUT_CONTACT, CARD_VALUES.OUT_NONWALK, CARD_VALUES.OUT_FLY];
  let outIdx = 0;
  while (posIdx < variablePositions.length) {
    card[variablePositions[posIdx++]] = outValues[outIdx % outValues.length];
    outIdx++;
  }

  return card;
}

/**
 * Determine pitcher role based on games started percentage.
 * SP if GS/G >= 0.50, CL if SV >= 10, else RP.
 */
export function determinePitcherRole(stats: PitchingStats): 'SP' | 'RP' | 'CL' {
  if (stats.G === 0) return 'RP';
  if (stats.SV >= 10) return 'CL';
  if (stats.GS / stats.G >= 0.50) return 'SP';
  return 'RP';
}

/**
 * Compute pitcher stamina (average IP per game appearance).
 */
export function computeStamina(stats: PitchingStats): number {
  if (stats.G === 0) return 0;
  // Convert baseball notation IP to decimal for the calculation
  const fullInnings = Math.floor(stats.IP);
  const partialOuts = Math.round((stats.IP - fullInnings) * 10);
  const decimalIP = fullInnings + partialOuts / 3;
  return decimalIP / stats.G;
}

/**
 * Determine pitcher usage flags based on pitching profile.
 */
export function determinePitcherUsageFlags(stats: PitchingStats): string[] {
  const flags: string[] = [];
  const fullInnings = Math.floor(stats.IP);
  const partialOuts = Math.round((stats.IP - fullInnings) * 10);
  const decimalIP = fullInnings + partialOuts / 3;

  if (decimalIP === 0) return flags;

  const k9 = (9 * stats.SO) / decimalIP;

  // Strikeout pitcher: K/9 > 9.0
  if (k9 > 9.0) {
    flags.push('strikeout');
  }

  // Ground/fly ball tendencies would need GO/AO which aren't in PitchingStats
  // For now we approximate: high WHIP + low HR/9 suggests groundball
  const hr9 = (9 * stats.HR) / decimalIP;
  const whip = (stats.BB + stats.H) / decimalIP;

  if (hr9 < 0.5 && whip > 1.2) {
    flags.push('groundball');
  } else if (hr9 > 1.2) {
    flags.push('flyball');
  }

  return flags;
}

/**
 * Build PitcherAttributes from pitching stats (REQ-DATA-005a + Step 6).
 */
export function buildPitcherAttributes(
  stats: PitchingStats,
  allPitcherERAs: number[],
): PitcherAttributes {
  const role = determinePitcherRole(stats);
  const grade = computePitcherGrade(stats.ERA, allPitcherERAs);
  const stamina = computeStamina(stats);

  // Convert IP to decimal for per-9 rates
  const fullInnings = Math.floor(stats.IP);
  const partialOuts = Math.round((stats.IP - fullInnings) * 10);
  const decimalIP = fullInnings + partialOuts / 3;

  const k9 = decimalIP > 0 ? (9 * stats.SO) / decimalIP : 0;
  const bb9 = decimalIP > 0 ? (9 * stats.BB) / decimalIP : 0;
  const hr9 = decimalIP > 0 ? (9 * stats.HR) / decimalIP : 0;

  const usageFlags = determinePitcherUsageFlags(stats);

  return {
    role,
    grade,
    stamina,
    era: stats.ERA,
    whip: stats.WHIP,
    k9,
    bb9,
    hr9,
    usageFlags,
    isReliever: role === 'RP' || role === 'CL',
  };
}
