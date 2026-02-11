/**
 * Archive Builder
 *
 * REQ-SCH-009: Builds enriched archive data from league state at season end.
 * Computes champion name, stores playoff results, and computes league leaders.
 *
 * Reuses getBattingLeaders / getPitchingLeaders from stats/leaders.ts.
 *
 * Layer 1: Pure logic, no I/O, no side effects.
 */

import type { FullPlayoffBracket } from '../types/schedule';
import type { BattingStats, PitchingStats } from '../types/stats';
import type { BattingLeaderEntry, PitchingLeaderEntry } from '../stats/leaders';
import { getBattingLeaders, getPitchingLeaders } from '../stats/leaders';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArchiveLeaderEntry {
  playerId: string;
  playerName: string;
  teamId: string;
  value: number;
  rank: number;
}

export interface ArchiveTeam {
  id: string;
  name: string;
  city: string;
  wins: number;
  losses: number;
  league_division: string;
  division: string;
}

export interface ArchiveSeasonStat {
  player_id: string;
  team_id: string;
  batting_stats: Record<string, unknown> | null;
  pitching_stats: Record<string, unknown> | null;
}

export interface ArchiveDataResult {
  champion: string | null;
  playoffResults: FullPlayoffBracket | null;
  leagueLeaders: {
    batting: Record<string, ArchiveLeaderEntry[]>;
    pitching: Record<string, ArchiveLeaderEntry[]>;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BATTING_CATEGORIES = ['HR', 'RBI', 'BA', 'H', 'SB'] as const;
const PITCHING_CATEGORIES = ['W', 'SO', 'ERA', 'SV', 'WHIP'] as const;
const LEADER_LIMIT = 5;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Build enriched archive data from league state at season end.
 */
export function buildArchiveData(opts: {
  teams: readonly ArchiveTeam[];
  playoffBracket: FullPlayoffBracket | null;
  seasonStats: readonly ArchiveSeasonStat[];
  playerNameCache: Record<string, string>;
  totalGames: number;
}): ArchiveDataResult {
  const champion = resolveChampion(opts.playoffBracket, opts.teams);
  const playoffResults = opts.playoffBracket;
  const leagueLeaders = computeLeagueLeaders(
    opts.seasonStats,
    opts.teams,
    opts.playerNameCache,
    opts.totalGames,
  );

  return { champion, playoffResults, leagueLeaders };
}

/**
 * Resolve worldSeriesChampionId to "City Name" string.
 */
function resolveChampion(
  bracket: FullPlayoffBracket | null,
  teams: readonly ArchiveTeam[],
): string | null {
  if (!bracket?.worldSeriesChampionId) return null;
  const team = teams.find((t) => t.id === bracket.worldSeriesChampionId);
  return team ? `${team.city} ${team.name}` : null;
}

/**
 * Build BattingLeaderEntry[] from season stats for leader computation.
 */
function toBattingEntries(
  seasonStats: readonly ArchiveSeasonStat[],
  teams: readonly ArchiveTeam[],
): BattingLeaderEntry[] {
  const teamDivMap = new Map(teams.map((t) => [t.id, t.league_division]));
  const entries: BattingLeaderEntry[] = [];

  for (const stat of seasonStats) {
    if (!stat.batting_stats) continue;
    const div = teamDivMap.get(stat.team_id) ?? 'AL';
    entries.push({
      playerId: stat.player_id,
      teamId: stat.team_id,
      leagueDivision: div as 'AL' | 'NL',
      stats: stat.batting_stats as unknown as BattingStats,
    });
  }

  return entries;
}

/**
 * Build PitchingLeaderEntry[] from season stats for leader computation.
 */
function toPitchingEntries(
  seasonStats: readonly ArchiveSeasonStat[],
  teams: readonly ArchiveTeam[],
): PitchingLeaderEntry[] {
  const teamDivMap = new Map(teams.map((t) => [t.id, t.league_division]));
  const entries: PitchingLeaderEntry[] = [];

  for (const stat of seasonStats) {
    if (!stat.pitching_stats) continue;
    const div = teamDivMap.get(stat.team_id) ?? 'AL';
    entries.push({
      playerId: stat.player_id,
      teamId: stat.team_id,
      leagueDivision: div as 'AL' | 'NL',
      stats: stat.pitching_stats as unknown as PitchingStats,
    });
  }

  return entries;
}

/**
 * Compute top 5 leaders for each batting and pitching category.
 */
function computeLeagueLeaders(
  seasonStats: readonly ArchiveSeasonStat[],
  teams: readonly ArchiveTeam[],
  nameCache: Record<string, string>,
  totalGames: number,
): ArchiveDataResult['leagueLeaders'] {
  const battingEntries = toBattingEntries(seasonStats, teams);
  const pitchingEntries = toPitchingEntries(seasonStats, teams);

  const batting: Record<string, ArchiveLeaderEntry[]> = {};
  for (const cat of BATTING_CATEGORIES) {
    const ranked = getBattingLeaders(battingEntries, cat, totalGames, LEADER_LIMIT);
    batting[cat] = ranked.map((r) => ({
      playerId: r.playerId,
      playerName: nameCache[r.playerId] ?? r.playerId,
      teamId: r.teamId,
      value: r.value,
      rank: r.rank,
    }));
  }

  const pitching: Record<string, ArchiveLeaderEntry[]> = {};
  for (const cat of PITCHING_CATEGORIES) {
    const ranked = getPitchingLeaders(pitchingEntries, cat, totalGames, LEADER_LIMIT);
    pitching[cat] = ranked.map((r) => ({
      playerId: r.playerId,
      playerName: nameCache[r.playerId] ?? r.playerId,
      teamId: r.teamId,
      value: r.value,
      rank: r.rank,
    }));
  }

  return { batting, pitching };
}
