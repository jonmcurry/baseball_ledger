/**
 * League Leaders
 *
 * REQ-STS-003: League leader boards for batting and pitching categories.
 * REQ-STS-004: Team aggregate stats and Pythagorean expectation.
 *
 * Computes qualification thresholds, ranks players by category,
 * filters by league, and aggregates team-level statistics.
 *
 * Layer 1: Pure logic, no I/O, deterministic.
 */

import type { BattingStats, PitchingStats } from '../types/stats';
import { computeBA, computeOBP, computeSLG, ipToDecimal } from './derived';
import { computePythagorean } from './standings';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BattingLeaderEntry {
  playerId: string;
  playerName?: string;
  teamId: string;
  teamName?: string;
  leagueDivision: 'AL' | 'NL';
  stats: BattingStats;
}

export interface PitchingLeaderEntry {
  playerId: string;
  playerName?: string;
  teamId: string;
  teamName?: string;
  leagueDivision: 'AL' | 'NL';
  stats: PitchingStats;
}

interface RankedBattingEntry extends BattingLeaderEntry {
  rank: number;
  value: number;
}

interface RankedPitchingEntry extends PitchingLeaderEntry {
  rank: number;
  value: number;
}

export interface TeamAggregateStats {
  teamId: string;
  runsScored: number;
  runsAllowed: number;
  runDifferential: number;
  totalHR: number;
  totalSB: number;
  totalErrors: number;
  teamBA: number;
  teamOBP: number;
  teamSLG: number;
  teamERA: number;
  pythagoreanWinPct: number;
}

// ---------------------------------------------------------------------------
// Batting stat categories
// ---------------------------------------------------------------------------

/** Rate stats require qualification; counting stats do not. */
const BATTING_RATE_STATS = new Set<string>(['BA', 'OBP', 'SLG', 'OPS']);

/** Stats that sort ascending (lower is better). None for batting. */
const BATTING_ASC_STATS = new Set<string>();

/** Pitching rate stats requiring qualification. */
const PITCHING_RATE_STATS = new Set<string>(['ERA', 'WHIP']);

/** Pitching stats that sort ascending (lower is better). */
const PITCHING_ASC_STATS = new Set<string>(['ERA', 'WHIP']);

// ---------------------------------------------------------------------------
// Qualification
// ---------------------------------------------------------------------------

/**
 * Check if a batter qualifies for rate stat leaderboards.
 * MLB rule: minimum 3.1 plate appearances per team game.
 * PA = AB + BB + HBP + SF + SH
 */
export function isBattingQualified(stats: BattingStats, teamGames: number): boolean {
  const pa = stats.AB + stats.BB + stats.HBP + stats.SF + stats.SH;
  return pa >= teamGames * 3.1;
}

/**
 * Check if a pitcher qualifies for rate stat leaderboards.
 * MLB rule: minimum 1.0 inning pitched per team game.
 */
export function isPitchingQualified(stats: PitchingStats, teamGames: number): boolean {
  const decimalIP = ipToDecimal(stats.IP);
  return decimalIP >= teamGames;
}

// ---------------------------------------------------------------------------
// Leader extraction helpers
// ---------------------------------------------------------------------------

function getBattingStatValue(stats: BattingStats, category: string): number {
  switch (category) {
    case 'BA': return stats.BA;
    case 'OBP': return stats.OBP;
    case 'SLG': return stats.SLG;
    case 'OPS': return stats.OPS;
    case 'HR': return stats.HR;
    case 'RBI': return stats.RBI;
    case 'R': return stats.R;
    case 'H': return stats.H;
    case 'doubles': return stats.doubles;
    case 'triples': return stats.triples;
    case 'SB': return stats.SB;
    case 'BB': return stats.BB;
    default: return 0;
  }
}

function getPitchingStatValue(stats: PitchingStats, category: string): number {
  switch (category) {
    case 'ERA': return stats.ERA;
    case 'WHIP': return stats.WHIP;
    case 'W': return stats.W;
    case 'SO': return stats.SO;
    case 'SV': return stats.SV;
    case 'CG': return stats.CG;
    case 'SHO': return stats.SHO;
    case 'IP': return stats.IP;
    default: return 0;
  }
}

// ---------------------------------------------------------------------------
// Batting Leaders
// ---------------------------------------------------------------------------

/**
 * Get batting leaders for a given category.
 * Rate stats (BA, OBP, SLG, OPS) require qualification.
 * Counting stats (HR, RBI, etc.) include all players.
 */
export function getBattingLeaders(
  players: readonly BattingLeaderEntry[],
  category: string,
  teamGames: number,
  limit: number,
): RankedBattingEntry[] {
  const isRate = BATTING_RATE_STATS.has(category);
  const ascending = BATTING_ASC_STATS.has(category);

  const eligible = isRate
    ? players.filter((p) => isBattingQualified(p.stats, teamGames))
    : [...players];

  const withValues = eligible.map((p) => ({
    ...p,
    rank: 0,
    value: getBattingStatValue(p.stats, category),
  }));

  withValues.sort((a, b) => ascending ? a.value - b.value : b.value - a.value);

  const limited = withValues.slice(0, limit);
  for (let i = 0; i < limited.length; i++) {
    limited[i].rank = i + 1;
  }

  return limited;
}

// ---------------------------------------------------------------------------
// Pitching Leaders
// ---------------------------------------------------------------------------

/**
 * Get pitching leaders for a given category.
 * Rate stats (ERA, WHIP) require qualification and sort ascending.
 * Counting stats (W, SO, SV) sort descending.
 */
export function getPitchingLeaders(
  players: readonly PitchingLeaderEntry[],
  category: string,
  teamGames: number,
  limit: number,
): RankedPitchingEntry[] {
  const isRate = PITCHING_RATE_STATS.has(category);
  const ascending = PITCHING_ASC_STATS.has(category);

  const eligible = isRate
    ? players.filter((p) => isPitchingQualified(p.stats, teamGames))
    : [...players];

  const withValues = eligible.map((p) => ({
    ...p,
    rank: 0,
    value: getPitchingStatValue(p.stats, category),
  }));

  withValues.sort((a, b) => ascending ? a.value - b.value : b.value - a.value);

  const limited = withValues.slice(0, limit);
  for (let i = 0; i < limited.length; i++) {
    limited[i].rank = i + 1;
  }

  return limited;
}

// ---------------------------------------------------------------------------
// League filter
// ---------------------------------------------------------------------------

/**
 * Filter leader entries by league or return all for 'combined'.
 */
export function filterByLeague<T extends { leagueDivision: string }>(
  entries: readonly T[],
  league: 'AL' | 'NL' | 'combined',
): T[] {
  if (league === 'combined') return [...entries];
  return entries.filter((e) => e.leagueDivision === league);
}

// ---------------------------------------------------------------------------
// Team Aggregate Stats
// ---------------------------------------------------------------------------

/**
 * Compute aggregate statistics for a team.
 * Combines individual batter/pitcher stats into team totals.
 */
export function computeTeamAggregateStats(
  teamId: string,
  batters: readonly BattingStats[],
  pitchers: readonly PitchingStats[],
  runsScored: number,
  runsAllowed: number,
  totalErrors: number,
): TeamAggregateStats {
  // Sum batting stats
  let totalAB = 0;
  let totalH = 0;
  let totalDoubles = 0;
  let totalTriples = 0;
  let totalHR = 0;
  let totalSB = 0;
  let totalBB = 0;
  let totalHBP = 0;
  let totalSF = 0;

  for (const b of batters) {
    totalAB += b.AB;
    totalH += b.H;
    totalDoubles += b.doubles;
    totalTriples += b.triples;
    totalHR += b.HR;
    totalSB += b.SB;
    totalBB += b.BB;
    totalHBP += b.HBP;
    totalSF += b.SF;
  }

  // Sum pitching stats
  let totalIP = 0;
  let totalER = 0;

  for (const p of pitchers) {
    totalIP += ipToDecimal(p.IP);
    totalER += p.ER;
  }

  const teamBA = computeBA(totalH, totalAB);
  const teamOBP = computeOBP(totalH, totalBB, totalHBP, totalAB, totalSF);
  const teamSLG = computeSLG(totalH, totalDoubles, totalTriples, totalHR, totalAB);
  const teamERA = totalIP === 0 ? 0 : (totalER * 9) / totalIP;
  const pythagoreanWinPct = computePythagorean(runsScored, runsAllowed);

  return {
    teamId,
    runsScored,
    runsAllowed,
    runDifferential: runsScored - runsAllowed,
    totalHR,
    totalSB,
    totalErrors,
    teamBA,
    teamOBP,
    teamSLG,
    teamERA,
    pythagoreanWinPct,
  };
}
