/**
 * Stats Accumulator
 *
 * REQ-STS-001: After every simulated game, accumulate stats into season
 * totals for every player who participated.
 *
 * Accumulates BattingLine/PitchingLine from game results into season
 * BattingStats/PitchingStats. All functions are immutable -- they return
 * new objects rather than mutating inputs.
 *
 * Layer 1: Pure logic, no I/O, deterministic.
 */

import type { BattingLine, PitchingLine } from '../types/game';
import type { BattingStats, PitchingStats } from '../types/stats';
import { addIP, computeDerivedBatting, computeDerivedPitching } from './derived';

/**
 * Create a zero-initialized BattingStats object.
 */
export function createEmptyBattingStats(): BattingStats {
  return {
    G: 0, AB: 0, R: 0, H: 0, doubles: 0, triples: 0, HR: 0,
    RBI: 0, SB: 0, CS: 0, BB: 0, SO: 0, IBB: 0, HBP: 0, SH: 0, SF: 0, GIDP: 0,
    BA: 0, OBP: 0, SLG: 0, OPS: 0,
  };
}

/**
 * Create a zero-initialized PitchingStats object.
 */
export function createEmptyPitchingStats(): PitchingStats {
  return {
    G: 0, GS: 0, W: 0, L: 0, SV: 0, IP: 0, H: 0, R: 0, ER: 0,
    HR: 0, BB: 0, SO: 0, HBP: 0, BF: 0, WP: 0, BK: 0, CG: 0, SHO: 0,
    HLD: 0, BS: 0,
    ERA: 0, WHIP: 0, FIP: 0,
  };
}

/**
 * Accumulate a BattingLine into season BattingStats.
 * Increments G by 1, adds counting stats, recomputes derived stats.
 * Returns a new BattingStats (does not mutate input).
 */
export function accumulateBatting(
  season: BattingStats,
  line: BattingLine,
): BattingStats {
  const updated: BattingStats = {
    ...season,
    G: season.G + 1,
    AB: season.AB + line.AB,
    R: season.R + line.R,
    H: season.H + line.H,
    doubles: season.doubles + line.doubles,
    triples: season.triples + line.triples,
    HR: season.HR + line.HR,
    RBI: season.RBI + line.RBI,
    SB: season.SB + line.SB,
    CS: season.CS + line.CS,
    BB: season.BB + line.BB,
    SO: season.SO + line.SO,
    IBB: season.IBB,
    HBP: season.HBP + line.HBP,
    SH: season.SH,
    SF: season.SF + line.SF,
    GIDP: season.GIDP,
    BA: 0, OBP: 0, SLG: 0, OPS: 0,
  };
  return computeDerivedBatting(updated);
}

/**
 * Accumulate a PitchingLine into season PitchingStats.
 * Increments G by 1, GS if starter, maps decision to W/L/SV/HLD/BS,
 * uses addIP for innings. Returns a new PitchingStats.
 */
export function accumulatePitching(
  season: PitchingStats,
  line: PitchingLine,
  isStarter: boolean,
): PitchingStats {
  const updated: PitchingStats = {
    ...season,
    G: season.G + 1,
    GS: season.GS + (isStarter ? 1 : 0),
    W: season.W + (line.decision === 'W' ? 1 : 0),
    L: season.L + (line.decision === 'L' ? 1 : 0),
    SV: season.SV + (line.decision === 'SV' ? 1 : 0),
    IP: addIP(season.IP, line.IP),
    H: season.H + line.H,
    R: season.R + line.R,
    ER: season.ER + line.ER,
    HR: season.HR + line.HR,
    BB: season.BB + line.BB,
    SO: season.SO + line.SO,
    HBP: season.HBP,
    BF: season.BF + line.BF,
    WP: season.WP,
    BK: season.BK,
    CG: season.CG + (line.CG ?? 0),
    SHO: season.SHO + (line.SHO ?? 0),
    HLD: season.HLD + (line.decision === 'HLD' ? 1 : 0),
    BS: season.BS + (line.decision === 'BS' ? 1 : 0),
    ERA: 0, WHIP: 0, FIP: 0,
  };
  return computeDerivedPitching(updated);
}

/**
 * Accumulate all player lines from a game into season stats maps.
 * Creates new entries for first-time players automatically.
 * Returns new Map instances (originals not mutated).
 */
export function accumulateGameStats(
  seasonBatting: ReadonlyMap<string, BattingStats>,
  seasonPitching: ReadonlyMap<string, PitchingStats>,
  battingLines: readonly BattingLine[],
  pitchingLines: readonly PitchingLine[],
  starterIds: ReadonlySet<string>,
): {
  batting: Map<string, BattingStats>;
  pitching: Map<string, PitchingStats>;
} {
  const batting = new Map(seasonBatting);
  const pitching = new Map(seasonPitching);

  for (const line of battingLines) {
    const existing = batting.get(line.playerId) ?? createEmptyBattingStats();
    batting.set(line.playerId, accumulateBatting(existing, line));
  }

  for (const line of pitchingLines) {
    const existing = pitching.get(line.playerId) ?? createEmptyPitchingStats();
    const isStarter = starterIds.has(line.playerId);
    pitching.set(line.playerId, accumulatePitching(existing, line, isStarter));
  }

  return { batting, pitching };
}
