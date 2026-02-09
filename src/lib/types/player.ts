export type CardValue = number; // 0-42

export type Position =
  | 'C' | '1B' | '2B' | '3B' | 'SS'
  | 'LF' | 'CF' | 'RF' | 'DH'
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

  // The card: 35-element array, each value 0-42
  // 9 positions are structural constants (positions 1,3,6,11,13,18,23,25,32)
  // ~26 positions vary per player, encoding outcome probability distribution
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
}
