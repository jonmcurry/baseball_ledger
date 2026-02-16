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
 * All card values MUST be IDT-active [15-21] so they go through the pitcher
 * grade gate when position 24 is drawn.
 *
 * Calibrated from BBW binary card analysis (535 batters across 3 seasons).
 * BBW power ratings cluster around 18-20 for most batters, with the modal
 * value determined by ISO bucket:
 *
 * ISO Range     | Card[24] | BBW Mode | Description
 * < 0.050       | 18       | 18       | No power (slap hitters)
 * 0.050 - 0.079 | 18       | 18       | Minimal power
 * 0.080 - 0.109 | 18       | 18       | Below average
 * 0.110 - 0.149 | 19       | 20       | Average power
 * 0.150 - 0.189 | 20       | 20       | Above average
 * 0.190 - 0.229 | 20       | 20       | Good power
 * 0.230 - 0.279 | 20       | 20       | Very good (20+ HR pace)
 * >= 0.280      | 21       | n/a      | Excellent power
 */
export const POWER_TIERS: readonly PowerTier[] = [
  { maxISO: 0.050, cardValue: 18, label: 'No power' },
  { maxISO: 0.080, cardValue: 18, label: 'Minimal power' },
  { maxISO: 0.110, cardValue: 18, label: 'Below average' },
  { maxISO: 0.150, cardValue: 19, label: 'Average power' },
  { maxISO: 0.190, cardValue: 20, label: 'Above average' },
  { maxISO: 0.230, cardValue: 20, label: 'Good power' },
  { maxISO: 0.280, cardValue: 20, label: 'Very good' },
  { maxISO: Infinity, cardValue: 21, label: 'Excellent power' },
];

/**
 * Map ISO (Isolated Power = SLG - BA) to the APBA 8-tier power rating.
 * Returns the CardValue (15-21) for card position 24. All values are
 * IDT-active so position 24 draws always go through the grade gate.
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
