import type { PlayerCard, Position, MlbBattingStats, MlbPitchingStats, PitcherAttributes } from '../types';
import type { PlayerPoolEntry, LeagueAverages } from '../csv/csv-types';
import type { BbwPlayerRecord, BbwBattingStats, BbwPitchingStats } from '../bbw/types';
import { CARD_LENGTH, applyStructuralConstants, POWER_POSITION } from './structural';
import { computePlayerRates } from './rate-calculator';
import { computePowerRating } from './power-rating';
import { determineArchetype, isEliteFielder } from './archetype';
import { computeSlotAllocation, fillVariablePositions, applyGateValues } from './value-mapper';
import { generatePitcherBattingCard, buildPitcherAttributes } from './pitcher-card';
import { generateApbaCard, generatePitcherApbaCard } from './apba-card-generator';

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

  // Step 5 (early): Compute archetype before card fill so we can pass
  // archetype bytes to the allocation model for hit contribution accounting.
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

  let card: number[];
  let powerRating: number;
  let apbaCard;

  if (isPitcher) {
    // Step 6: Pitcher batting card
    card = generatePitcherBattingCard();
    powerRating = 13; // No power
    apbaCard = generatePitcherApbaCard();
  } else if (entry.battingStats) {
    // Steps 1-3: Batter card generation
    const rates = computePlayerRates(entry.battingStats);

    // Step 2: Apply structural constants
    card = new Array(CARD_LENGTH).fill(0);
    applyStructuralConstants(card);

    // Step 2b: Apply gate values (positions 0, 15, 20)
    const { gateWalkCount, gateKCount } = applyGateValues(
      card, rates.walkRate, rates.strikeoutRate, rates.iso,
    );

    // Step 3: Fill outcome positions (20 positions, excluding gates/power)
    // Pass archetype bytes so allocation can subtract their hit contributions
    const allocation = computeSlotAllocation(
      rates, gateWalkCount, gateKCount,
      archetype.byte33, archetype.byte34,
    );
    const babip = computeBABIP(entry);
    const playerSpeed = computeSpeed(entry);
    fillVariablePositions(card, allocation, babip, playerSpeed);

    // Step 4: Power rating at position 24 (BBW card[24] = power value 13-21)
    powerRating = computePowerRating(rates.iso);
    card[POWER_POSITION] = powerRating;

    // SERD: Generate 5-column APBA card from the same rates
    apbaCard = generateApbaCard(rates, archetype);
  } else {
    // Fallback: empty card (shouldn't happen for qualifying players)
    card = new Array(CARD_LENGTH).fill(0);
    applyStructuralConstants(card);
    powerRating = 13;
    apbaCard = generatePitcherApbaCard();
  }

  // Set archetype bytes on card (positions 33-34, after fill)
  card[33] = archetype.byte33;
  card[34] = archetype.byte34;

  // Build pitcher attributes if this is a qualifying pitcher
  let pitching = undefined;
  if (entry.qualifiesAsPitcher && entry.pitchingStats) {
    pitching = buildPitcherAttributes(entry.pitchingStats, allPitcherERAs);
  }

  // Build MLB stats from entry
  let mlbBattingStats: MlbBattingStats | undefined;
  if (entry.battingStats) {
    const s = entry.battingStats;
    mlbBattingStats = {
      G: s.G,
      AB: s.AB,
      R: s.R,
      H: s.H,
      doubles: s.doubles,
      triples: s.triples,
      HR: s.HR,
      RBI: s.RBI,
      SB: s.SB,
      CS: s.CS,
      BB: s.BB,
      SO: s.SO,
      BA: s.BA,
      OBP: s.OBP,
      SLG: s.SLG,
      OPS: s.OPS,
    };
  }

  let mlbPitchingStats: MlbPitchingStats | undefined;
  if (entry.pitchingStats) {
    const p = entry.pitchingStats;
    mlbPitchingStats = {
      G: p.G,
      GS: p.GS,
      W: p.W,
      L: p.L,
      SV: p.SV,
      IP: p.IP,
      H: p.H,
      ER: p.ER,
      HR: p.HR,
      BB: p.BB,
      SO: p.SO,
      ERA: p.ERA,
      WHIP: p.WHIP,
    };
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
    apbaCard,
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
    mlbBattingStats,
    mlbPitchingStats,
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

/**
 * Parse a BBW position string to extract primary position and batting/throwing hand.
 *
 * Position player format: "[POS] [DEF] [BAT] [NUM]" e.g. "OF  2 B 17"
 * Pitcher format: "[HAND] [GRADE] [FLAGS]" e.g. "L 14     Z"
 */
function parseBbwPositionString(posStr: string): {
  primaryPosition: Position;
  isPitcher: boolean;
  battingHand: 'L' | 'R' | 'S';
  throwingHand: 'L' | 'R';
  pitcherGrade?: number;
  isReliever?: boolean;
} {
  const trimmed = posStr.trim();

  // Pitcher: starts with L or R followed by space and a number (grade)
  const pitcherMatch = trimmed.match(/^([LR])\s+(\d+)(\*)?/);
  if (pitcherMatch) {
    const throwingHand = pitcherMatch[1] as 'L' | 'R';
    const grade = parseInt(pitcherMatch[2], 10);
    const isReliever = pitcherMatch[3] === '*';
    return {
      primaryPosition: isReliever ? 'RP' : 'SP',
      isPitcher: true,
      battingHand: throwingHand === 'L' ? 'L' : 'R',
      throwingHand,
      pitcherGrade: grade,
      isReliever,
    };
  }

  // Position player: starts with position code
  const posMatch = trimmed.match(/^(OF|1B|2B|3B|SS|C|DH)\s+\d+\s+([LRBS])/);
  if (posMatch) {
    const pos = posMatch[1] as Position;
    const hand = posMatch[2];
    return {
      primaryPosition: pos,
      isPitcher: false,
      battingHand: hand === 'B' || hand === 'S' ? 'S' : hand as 'L' | 'R',
      throwingHand: 'R', // Default; position players' throwing hand not in position string
    };
  }

  // Fallback
  return {
    primaryPosition: 'DH',
    isPitcher: false,
    battingHand: 'R',
    throwingHand: 'R',
  };
}

/**
 * Convert a BBW binary player record + stats into a PlayerCard.
 *
 * The card bytes come directly from PLAYERS.DAT (the exact same card BBW uses).
 * Stats come from NSTAT.DAT/PSTAT.DAT. Defensive ratings are derived from stats.
 *
 * @param player - Parsed PLAYERS.DAT record
 * @param batting - Matching NSTAT.DAT record (same index)
 * @param pitching - Matching PSTAT.DAT record (if pitcher), or undefined
 * @param seasonYear - The season year for this data set
 * @param allPitcherERAs - All pitcher ERAs in the season for grade percentile calculation
 */
export function generateCardFromBbw(
  player: BbwPlayerRecord,
  batting: BbwBattingStats,
  pitching: BbwPitchingStats | undefined,
  seasonYear: number,
  allPitcherERAs: number[],
): PlayerCard {
  const parsed = parseBbwPositionString(player.positionString);

  // Card bytes directly from PLAYERS.DAT binary
  const card = [...player.card];
  const powerRating = card[24];
  const archetype = { byte33: card[33], byte34: card[34] };

  // Compute batting-derived attributes from NSTAT
  const PA = batting.AB + batting.BB + batting.HBP;
  const singles = Math.max(0, batting.H - batting.doubles - batting.triples - batting.HR);
  const BA = batting.AB > 0 ? batting.H / batting.AB : 0;
  const TB = singles + 2 * batting.doubles + 3 * batting.triples + 4 * batting.HR;
  const SLG = batting.AB > 0 ? TB / batting.AB : 0;
  const OBP = PA > 0 ? (batting.H + batting.BB + batting.HBP) / PA : 0;
  const iso = SLG - BA;

  // Speed from SB data
  const sbTotal = batting.SB; // CS not in NSTAT, approximate
  const speed = PA > 0 ? Math.min(1.0, sbTotal / 50) : 0;

  // Discipline from BB/SO ratio
  const discipline = batting.SO > 0 ? Math.min(1.0, batting.BB / batting.SO) : (batting.BB > 0 ? 1.0 : 0);

  // Contact rate
  const contactRate = PA > 0 ? Math.max(0, 1 - batting.SO / PA) : 0;

  // Build pitcher attributes from PSTAT
  let pitcherAttrs: PitcherAttributes | undefined;
  if (pitching && parsed.isPitcher) {
    const era = pitching.outs > 0 ? (pitching.ER * 27) / pitching.outs : 99;
    const whip = pitching.IP > 0 ? (pitching.BB + pitching.H) / pitching.IP : 99;
    const k9 = pitching.IP > 0 ? (pitching.SO * 9) / pitching.IP : 0;
    const bb9 = pitching.IP > 0 ? (pitching.BB * 9) / pitching.IP : 0;
    const hr9 = pitching.IP > 0 ? (pitching.HRA * 9) / pitching.IP : 0;

    // Use position string grade if available, otherwise compute from ERA rank
    let grade = parsed.pitcherGrade ?? 8;
    if (!parsed.pitcherGrade && allPitcherERAs.length > 0) {
      const sorted = [...allPitcherERAs].sort((a, b) => a - b);
      const rank = sorted.indexOf(era);
      const pct = rank / sorted.length;
      grade = Math.max(1, Math.min(15, Math.round(15 - pct * 14)));
    }

    pitcherAttrs = {
      role: pitching.SV >= 10 ? 'CL' : (pitching.GS / pitching.G >= 0.5 ? 'SP' : 'RP'),
      grade,
      stamina: pitching.IP / Math.max(1, pitching.GS || pitching.G),
      era,
      whip,
      k9,
      bb9,
      hr9,
      usageFlags: [],
      isReliever: parsed.isReliever ?? false,
    };
  }

  // MLB batting stats
  const mlbBattingStats: MlbBattingStats = {
    G: batting.G,
    AB: batting.AB,
    R: batting.R,
    H: batting.H,
    doubles: batting.doubles,
    triples: batting.triples,
    HR: batting.HR,
    RBI: batting.RBI,
    SB: batting.SB,
    CS: 0, // Not in NSTAT
    BB: batting.BB,
    SO: batting.SO,
    BA,
    OBP,
    SLG,
    OPS: OBP + SLG,
  };

  // MLB pitching stats
  let mlbPitchingStats: MlbPitchingStats | undefined;
  if (pitching) {
    mlbPitchingStats = {
      G: pitching.G,
      GS: pitching.GS,
      W: pitching.W,
      L: pitching.L,
      SV: pitching.SV,
      IP: pitching.IP,
      H: pitching.H,
      ER: pitching.ER,
      HR: pitching.HRA,
      BB: pitching.BB,
      SO: pitching.SO,
      ERA: pitching.outs > 0 ? (pitching.ER * 27) / pitching.outs : 99,
      WHIP: pitching.IP > 0 ? (pitching.BB + pitching.H) / pitching.IP : 99,
    };
  }

  // Generate SERD 5-column card from BBW batting stats
  const bbwApbaCard = parsed.isPitcher
    ? generatePitcherApbaCard()
    : generateApbaCard({
        PA: PA || 1,
        walkRate: PA > 0 ? batting.BB / PA : 0,
        strikeoutRate: PA > 0 ? batting.SO / PA : 0,
        homeRunRate: PA > 0 ? batting.HR / PA : 0,
        singleRate: PA > 0 ? singles / PA : 0,
        doubleRate: PA > 0 ? batting.doubles / PA : 0,
        tripleRate: PA > 0 ? batting.triples / PA : 0,
        sbRate: batting.SB > 0 ? 1 : 0,
        iso,
        hbpRate: PA > 0 ? batting.HBP / PA : 0,
        sfRate: 0,
        shRate: 0,
        gdpRate: 0,
      }, archetype);

  // Capitalize last name for consistency with Lahman format
  const nameLast = player.lastName.charAt(0) + player.lastName.slice(1).toLowerCase();

  return {
    playerId: `bbw_${seasonYear}_${player.index}`,
    nameFirst: player.firstName,
    nameLast,
    seasonYear,
    battingHand: parsed.battingHand,
    throwingHand: parsed.throwingHand,
    primaryPosition: parsed.primaryPosition,
    eligiblePositions: [parsed.primaryPosition],
    isPitcher: parsed.isPitcher,
    apbaCard: bbwApbaCard,
    card,
    powerRating,
    archetype,
    speed,
    power: iso,
    discipline,
    contactRate,
    fieldingPct: 0.970, // Default; fielding data not in PLAYERS.DAT
    range: 0.5,
    arm: 0.5,
    pitching: pitcherAttrs,
    mlbBattingStats,
    mlbPitchingStats,
  };
}
