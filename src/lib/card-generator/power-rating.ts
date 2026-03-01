import type { CardValue } from '../types';

/**
 * Power rating tier definition.
 */
export interface PowerTier {
  maxISO: number;        // upper bound (exclusive), Infinity for top tier
  cardValue: CardValue;
  label: string;
}

/**
 * BBW-calibrated power scale mapped from ISO (REQ-DATA-005 Step 4).
 *
 * Uses the full BBW 8-value range {13, 15, 16, 17, 18, 19, 20, 21} at
 * card position 24. Value 14 is never used per BBW analysis.
 *
 * Values 15-21 are IDT-active and go through bitmap-gated IDT lookup when
 * position 24 is drawn. Value 13 maps directly to WALK (not IDT-active),
 * which is correct BBW behavior for no-power pitchers/slap hitters.
 *
 * Calibrated from BBW binary card analysis (828 players, 1971 season):
 *
 * ISO Range     | Card[24] | BBW Count | Description
 * < 0.040       | 13       | 222 (27%) | No power (pitchers, slap hitters)
 * 0.040 - 0.069 | 15       | 40  (5%)  | Minimal power
 * 0.070 - 0.099 | 16       | 62  (8%)  | Below average
 * 0.100 - 0.129 | 17       | 82  (10%) | Average power
 * 0.130 - 0.169 | 18       | 118 (14%) | Above average
 * 0.170 - 0.209 | 19       | 60  (7%)  | Good power
 * 0.210 - 0.259 | 20       | 105 (13%) | Very good (20+ HR pace)
 * >= 0.260      | 21       | 138 (17%) | Excellent power
 */
export const POWER_TIERS: readonly PowerTier[] = [
  { maxISO: 0.040, cardValue: 13, label: 'No power' },
  { maxISO: 0.070, cardValue: 15, label: 'Minimal power' },
  { maxISO: 0.100, cardValue: 16, label: 'Below average' },
  { maxISO: 0.130, cardValue: 17, label: 'Average power' },
  { maxISO: 0.170, cardValue: 18, label: 'Above average' },
  { maxISO: 0.210, cardValue: 19, label: 'Good power' },
  { maxISO: 0.260, cardValue: 20, label: 'Very good' },
  { maxISO: Infinity, cardValue: 21, label: 'Excellent power' },
];

/**
 * Map ISO (Isolated Power = SLG - BA) to the APBA 8-tier power rating.
 * Returns the CardValue for card position 24. Values 15-21 are IDT-active;
 * value 13 (no power) maps directly to WALK per BBW.
 */
export function computePowerRating(iso: number): CardValue {
  for (const tier of POWER_TIERS) {
    if (iso < tier.maxISO) {
      return tier.cardValue;
    }
  }
  // Should never reach here due to Infinity, but just in case
  return 21;
}

/**
 * Get the human-readable label for a power rating card value.
 */
export function getPowerLabel(cardValue: CardValue): string {
  const tier = POWER_TIERS.find((t) => t.cardValue === cardValue);
  return tier?.label ?? 'Unknown';
}
