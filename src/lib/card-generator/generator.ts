import type { PlayerCard, Position } from '../types';
import type { PlayerPoolEntry, LeagueAverages } from '../csv/csv-types';
import { CARD_LENGTH, applyStructuralConstants } from './structural';
import { computePlayerRates } from './rate-calculator';
import { computePowerRating } from './power-rating';
import { determineArchetype, isEliteFielder } from './archetype';
import { computeSlotAllocation, fillVariablePositions } from './value-mapper';
import { generatePitcherBattingCard, buildPitcherAttributes } from './pitcher-card';

/**
 * Determine primary position from fielding records.
 * Uses the position with the most games played.
 */
function determinePrimaryPosition(entry: PlayerPoolEntry): Position {
  if (entry.qualifiesAsPitcher && !entry.qualifiesAsBatter) {
    // Pure pitcher
    const pitchingStats = entry.pitchingStats!;
    if (pitchingStats.GS / pitchingStats.G >= 0.5) return 'SP';
    if (pitchingStats.SV >= 10) return 'CL';
    return 'RP';
  }

  if (entry.fieldingRecords.length === 0) {
    return 'DH';
  }

  // Find position with most games
  let maxG = 0;
  let primaryPos: Position = 'DH';
  for (const record of entry.fieldingRecords) {
    if (record.G > maxG) {
      maxG = record.G;
      primaryPos = record.position as Position;
    }
  }
  return primaryPos;
}

/**
 * Determine all eligible positions from fielding records.
 * Includes any position where the player appeared in at least 5 games.
 */
function determineEligiblePositions(entry: PlayerPoolEntry, primaryPosition: Position): Position[] {
  const positions = new Set<Position>([primaryPosition]);

  for (const record of entry.fieldingRecords) {
    if (record.G >= 5) {
      positions.add(record.position as Position);
    }
  }

  return Array.from(positions);
}

/**
 * Compute fielding percentage from fielding records.
 * FPct = (PO + A) / (PO + A + E)
 */
function computeFieldingPct(entry: PlayerPoolEntry): number {
  let totalPO = 0;
  let totalA = 0;
  let totalE = 0;

  for (const record of entry.fieldingRecords) {
    totalPO += record.PO;
    totalA += record.A;
    totalE += record.E;
  }

  const total = totalPO + totalA + totalE;
  return total > 0 ? (totalPO + totalA) / total : 0;
}

/**
 * Compute range rating (0-1 scale) from fielding.
 * Based on assists per game relative to position norms.
 */
function computeRange(entry: PlayerPoolEntry): number {
  if (entry.fieldingRecords.length === 0) return 0;

  let totalA = 0;
  let totalG = 0;
  for (const record of entry.fieldingRecords) {
    totalA += record.A;
    totalG += record.G;
  }

  if (totalG === 0) return 0;
  const assistsPerGame = totalA / totalG;

  // Normalize: 0-1 scale, typical range 0-5 assists/game
  return Math.min(1.0, assistsPerGame / 5.0);
}

/**
 * Compute arm rating (0-1 scale).
 * Outfielders: assists indicate arm strength.
 * Infielders: DP participation indicates arm.
 */
function computeArm(entry: PlayerPoolEntry): number {
  if (entry.fieldingRecords.length === 0) return 0;

  let totalA = 0;
  let totalDP = 0;
  let totalG = 0;
  for (const record of entry.fieldingRecords) {
    totalA += record.A;
    totalDP += record.DP;
    totalG += record.G;
  }

  if (totalG === 0) return 0;

  // Combine assists and DP, normalize to 0-1
  const armMetric = (totalA + totalDP * 2) / totalG;
  return Math.min(1.0, armMetric / 8.0);
}

/**
 * Compute speed rating (0-1 scale) from stolen base data.
 */
function computeSpeed(entry: PlayerPoolEntry): number {
  if (!entry.battingStats) return 0;
  const { SB, CS, triples } = entry.battingStats;
  const PA = entry.battingStats.AB + entry.battingStats.BB + entry.battingStats.HBP + entry.battingStats.SH + entry.battingStats.SF;

  if (PA === 0) return 0;

  // Combine SB rate, SB volume, and triples rate
  const sbRate = SB + CS > 0 ? SB / (SB + CS) : 0;
  const sbVolume = Math.min(1.0, SB / 50); // 50 SB = max
  const tripleRate = Math.min(1.0, triples / PA * 20); // normalize triples

  return Math.min(1.0, sbRate * 0.4 + sbVolume * 0.4 + tripleRate * 0.2);
}

/**
 * Compute discipline rating (0-1 scale) from BB/K ratio.
 */
function computeDiscipline(entry: PlayerPoolEntry): number {
  if (!entry.battingStats) return 0;
  const { BB, SO } = entry.battingStats;

  if (SO === 0) return BB > 0 ? 1.0 : 0;
  const bbkRatio = BB / SO;

  // Normalize: ratio of 1.0+ = excellent discipline
  return Math.min(1.0, bbkRatio);
}

/**
 * Compute contact rate (0-1 scale): 1 - (SO/PA).
 */
function computeContactRate(entry: PlayerPoolEntry): number {
  if (!entry.battingStats) return 0;
  const PA = entry.battingStats.AB + entry.battingStats.BB + entry.battingStats.HBP + entry.battingStats.SH + entry.battingStats.SF;

  if (PA === 0) return 0;
  return Math.max(0, 1 - entry.battingStats.SO / PA);
}

/**
 * Compute BABIP from batting stats.
 * BABIP = (H - HR) / (AB - SO - HR + SF)
 */
function computeBABIP(entry: PlayerPoolEntry): number {
  if (!entry.battingStats) return 0.300; // default
  const s = entry.battingStats;
  const denom = s.AB - s.SO - s.HR + s.SF;
  if (denom <= 0) return 0.300;
  return (s.H - s.HR) / denom;
}

/**
 * Generate a complete PlayerCard from a PlayerPoolEntry (REQ-DATA-005).
 *
 * This is the main orchestrator that calls all sub-modules:
 * 1. Rate calculation (Step 1)
 * 2. Structural constants (Step 2)
 * 3. Value mapping (Step 3)
 * 4. Power rating (Step 4)
 * 5. Archetype assignment (Step 5)
 * 6. Pitcher card generation (Step 6)
 */
export function generateCard(
  entry: PlayerPoolEntry,
  _leagueAverages: LeagueAverages,
  allPitcherERAs: number[],
): PlayerCard {
  const isPitcher = entry.qualifiesAsPitcher && !entry.qualifiesAsBatter;
  const primaryPosition = determinePrimaryPosition(entry);
  const eligiblePositions = determineEligiblePositions(entry, primaryPosition);
  const fieldingPct = computeFieldingPct(entry);

  let card: number[];
  let powerRating: number;

  if (isPitcher) {
    // Step 6: Pitcher batting card
    card = generatePitcherBattingCard();
    powerRating = 13; // No power
  } else if (entry.battingStats) {
    // Steps 1-3: Batter card generation
    const rates = computePlayerRates(entry.battingStats);

    // Step 2: Apply structural constants
    card = new Array(CARD_LENGTH).fill(0);
    applyStructuralConstants(card);

    // Step 3: Fill variable positions
    const allocation = computeSlotAllocation(rates);
    const babip = computeBABIP(entry);
    fillVariablePositions(card, allocation, babip);

    // Step 4: Power rating
    powerRating = computePowerRating(rates.iso);
  } else {
    // Fallback: empty card (shouldn't happen for qualifying players)
    card = new Array(CARD_LENGTH).fill(0);
    applyStructuralConstants(card);
    powerRating = 13;
  }

  // Step 5: Archetype
  const battingStats = entry.battingStats;
  const sbRate = battingStats && (battingStats.SB + battingStats.CS > 0)
    ? battingStats.SB / (battingStats.SB + battingStats.CS) : 0;
  const eliteDefense = isEliteFielder(fieldingPct, primaryPosition);

  const archetype = determineArchetype(
    battingStats ?? {
      G: 0, AB: 0, R: 0, H: 0, doubles: 0, triples: 0, HR: 0, RBI: 0,
      SB: 0, CS: 0, BB: 0, SO: 0, IBB: 0, HBP: 0, SH: 0, SF: 0, GIDP: 0,
      BA: 0, OBP: 0, SLG: 0, OPS: 0,
    },
    entry.battingHand,
    isPitcher,
    primaryPosition,
    sbRate,
    eliteDefense,
    eligiblePositions.length,
  );

  // Set archetype and power in card
  card[33] = archetype.byte33;
  card[34] = archetype.byte34;

  // Build pitcher attributes if this is a qualifying pitcher
  let pitching = undefined;
  if (entry.qualifiesAsPitcher && entry.pitchingStats) {
    pitching = buildPitcherAttributes(entry.pitchingStats, allPitcherERAs);
  }

  return {
    playerId: entry.playerID,
    nameFirst: entry.nameFirst,
    nameLast: entry.nameLast,
    seasonYear: entry.seasonYear,
    battingHand: entry.battingHand,
    throwingHand: entry.throwingHand,
    primaryPosition,
    eligiblePositions,
    isPitcher,
    card,
    powerRating,
    archetype,
    speed: computeSpeed(entry),
    power: battingStats ? battingStats.SLG - battingStats.BA : 0,
    discipline: computeDiscipline(entry),
    contactRate: computeContactRate(entry),
    fieldingPct,
    range: computeRange(entry),
    arm: computeArm(entry),
    pitching,
  };
}

/**
 * Generate cards for all entries in a player pool.
 */
export function generateAllCards(
  pool: PlayerPoolEntry[],
  leagueAverages: LeagueAverages,
): PlayerCard[] {
  // Collect all qualifying pitcher ERAs for grade calculation
  const allPitcherERAs = pool
    .filter((e) => e.qualifiesAsPitcher && e.pitchingStats)
    .map((e) => e.pitchingStats!.ERA);

  return pool.map((entry) => generateCard(entry, leagueAverages, allPitcherERAs));
}
