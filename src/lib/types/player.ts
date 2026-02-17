import type { OutcomeCategory } from './game';

export type CardValue = number; // 0-42

/** SERD 5-column card system. Pitcher grade selects column A-E. */
export type ApbaColumn = 'A' | 'B' | 'C' | 'D' | 'E';

/** 36 outcome slots per column (simulating 2d6 roll, 36 equiprobable results). */
export type ColumnCard = readonly OutcomeCategory[];

/** 5-column APBA card. Each column has 36 OutcomeCategory outcomes.
 *  Column A = best pitcher (precise control), E = worst (wild). */
export interface ApbaCard {
  A: ColumnCard;
  B: ColumnCard;
  C: ColumnCard;
  D: ColumnCard;
  E: ColumnCard;
}

export type Position =
  | 'C' | '1B' | '2B' | '3B' | 'SS'
  | 'LF' | 'CF' | 'RF' | 'OF' | 'DH'
  | 'SP' | 'RP' | 'CL';

// Archetype flags derived from APBA card bytes 33-34 pair analysis
// (7,0) = Standard RH position player
// (0,1) = Standard LH/switch position player
// (6,0) = Speed/baserunning specialist
// (1,0) = Power hitter
// (1,1) = Power + platoon advantage
// (0,2) = Contact hitter with SB threat
// (0,6) = Pitcher (as batter)
// (8,0) = Elite defensive player
// (5,0) = Utility/pinch hit specialist
export interface PlayerArchetype {
  byte33: number; // 0-8
  byte34: number; // 0-6
}

export interface PitcherAttributes {
  role: 'SP' | 'RP' | 'CL';
  // APBA pitcher grade: 1-15 scale. Higher = more effective.
  // Derived from ERA rank within the league for that season.
  grade: number;
  stamina: number;        // Average IP per start, or relief innings capacity
  era: number;
  whip: number;
  k9: number;             // SO * 9 / IP
  bb9: number;            // BB * 9 / IP
  hr9: number;            // HR * 9 / IP
  // Y/Z/W/X usage flags (from APBA position string)
  usageFlags: string[];
  isReliever: boolean;
}

/** Real MLB season batting stats (from Lahman database) */
export interface MlbBattingStats {
  G: number;
  AB: number;
  R: number;
  H: number;
  doubles: number;
  triples: number;
  HR: number;
  RBI: number;
  SB: number;
  CS: number;
  BB: number;
  SO: number;
  BA: number;
  OBP: number;
  SLG: number;
  OPS: number;
}

/** Real MLB season pitching stats (from Lahman database) */
export interface MlbPitchingStats {
  G: number;
  GS: number;
  W: number;
  L: number;
  SV: number;
  IP: number;
  H: number;
  ER: number;
  HR: number;
  BB: number;
  SO: number;
  ERA: number;
  WHIP: number;
}

export interface PlayerCard {
  // Identity
  playerId: string;          // Lahman playerID (e.g., "ruthba01")
  nameFirst: string;
  nameLast: string;
  seasonYear: number;        // Which season's stats this card represents
  battingHand: 'L' | 'R' | 'S';
  throwingHand: 'L' | 'R';

  // Positional
  primaryPosition: Position;
  eligiblePositions: Position[];
  isPitcher: boolean;

  // SERD 5-column card: each column has 36 OutcomeCategory outcomes.
  // Pitcher grade selects column (A=best, E=worst). One roll -> one lookup -> one outcome.
  apbaCard: ApbaCard;

  // Legacy 35-byte card (deprecated, kept for backwards compatibility during transition)
  card: CardValue[];         // length = 35

  // Position 24: Extra-base power rating (7-tier scale)
  // 13=none, 15=minimal, 16=below avg, 17=avg, 18=above avg, 19=good, 20=very good, 21=excellent
  powerRating: number;

  // Bytes 33-34: Player archetype flags
  archetype: PlayerArchetype;

  // Batting modifiers
  speed: number;             // 0.0-1.0
  power: number;             // ISO = SLG - BA
  discipline: number;        // BB/K ratio, 0.0-1.0 scaled
  contactRate: number;       // 1 - (SO/PA), 0.0-1.0

  // Defensive ratings (0.0-1.0 scale)
  fieldingPct: number;
  range: number;
  arm: number;

  // Pitching attributes (only for isPitcher = true)
  pitching?: PitcherAttributes;

  // Real MLB season stats (from Lahman database)
  mlbBattingStats?: MlbBattingStats;
  mlbPitchingStats?: MlbPitchingStats;
}
