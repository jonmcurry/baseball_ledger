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
 * APBA 8-tier power scale mapped from ISO (REQ-DATA-005 Step 4).
 *
 * ISO Range     | Card[24] | Tier
 * < 0.050       | 13       | No power (pitchers, slap hitters)
 * 0.050 - 0.079 | 15       | Minimal power
 * 0.080 - 0.109 | 16       | Below average
 * 0.110 - 0.149 | 17       | Average power
 * 0.150 - 0.189 | 18       | Above average
 * 0.190 - 0.229 | 19       | Good power
 * 0.230 - 0.279 | 20       | Very good (20+ HR pace)
 * >= 0.280      | 21       | Excellent power
 */
export const POWER_TIERS: readonly PowerTier[] = [
  { maxISO: 0.050, cardValue: 13, label: 'No power' },
  { maxISO: 0.080, cardValue: 15, label: 'Minimal power' },
  { maxISO: 0.110, cardValue: 16, label: 'Below average' },
  { maxISO: 0.150, cardValue: 17, label: 'Average power' },
  { maxISO: 0.190, cardValue: 18, label: 'Above average' },
  { maxISO: 0.230, cardValue: 19, label: 'Good power' },
  { maxISO: 0.280, cardValue: 20, label: 'Very good' },
  { maxISO: Infinity, cardValue: 21, label: 'Excellent power' },
];

/**
 * Map ISO (Isolated Power = SLG - BA) to the APBA 8-tier power rating.
 * Returns the CardValue (13, 15-21) for card position 24.
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
