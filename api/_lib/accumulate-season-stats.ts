/**
 * Season Stats Accumulation
 *
 * REQ-STS-001: After every simulated game, accumulate stats into season
 * totals for every player who participated.
 *
 * Called after simulate_day_commit succeeds. Reads batting/pitching lines
 * from the day result, fetches existing season_stats, accumulates via
 * the pure accumulator functions, and upserts the updated totals.
 *
 * Layer 2: API infrastructure (I/O bridge between pure logic and DB).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DayResult } from '../../src/lib/simulation/season-runner';
import type { BattingStats, PitchingStats } from '../../src/lib/types/stats';
import {
  createEmptyBattingStats,
  createEmptyPitchingStats,
  accumulateBatting,
  accumulatePitching,
} from '../../src/lib/stats/accumulator';

/**
 * Accumulate batting and pitching lines from a day's simulation results
 * into the season_stats table.
 *
 * @param supabase - Server-side Supabase client
 * @param leagueId - League ID
 * @param seasonYear - Season year for the stats
 * @param dayResult - Compact game results containing batting/pitching lines
 * @param starterPitcherIds - Set of pitcher IDs who started games this day
 */
export async function accumulateSeasonStats(
  supabase: SupabaseClient,
  leagueId: string,
  seasonYear: number,
  dayResult: DayResult,
  starterPitcherIds: ReadonlySet<string>,
): Promise<void> {
  // Nothing to accumulate if no games were played
  if (dayResult.games.length === 0) return;

  // Step 1: Collect all unique player IDs from all games
  const allPlayerIds = new Set<string>();
  for (const game of dayResult.games) {
    for (const line of game.playerBattingLines) {
      allPlayerIds.add(line.playerId);
    }
    for (const line of game.playerPitchingLines) {
      allPlayerIds.add(line.playerId);
    }
  }

  if (allPlayerIds.size === 0) return;

  const playerIdArray = [...allPlayerIds];

  // Step 2: Fetch existing season_stats for these players
  const { data: existingRows, error: selectError } = await supabase
    .from('season_stats')
    .select('player_id, batting_stats, pitching_stats')
    .eq('league_id', leagueId)
    .in('player_id', playerIdArray);

  if (selectError) {
    throw {
      category: 'EXTERNAL',
      code: 'STATS_ACCUMULATION_FAILED',
      message: `Failed to fetch existing stats: ${selectError.message}`,
    };
  }

  // Step 3: Build lookup maps from existing stats
  const existingBatting = new Map<string, BattingStats>();
  const existingPitching = new Map<string, PitchingStats>();

  for (const row of existingRows ?? []) {
    if (row.batting_stats) {
      existingBatting.set(row.player_id, row.batting_stats as BattingStats);
    }
    if (row.pitching_stats) {
      existingPitching.set(row.player_id, row.pitching_stats as PitchingStats);
    }
  }

  // Step 4: Accumulate each game's lines into season totals
  const seasonBatting = new Map(existingBatting);
  const seasonPitching = new Map(existingPitching);

  for (const game of dayResult.games) {
    for (const line of game.playerBattingLines) {
      const existing = seasonBatting.get(line.playerId) ?? createEmptyBattingStats();
      seasonBatting.set(line.playerId, accumulateBatting(existing, line));
    }

    for (const line of game.playerPitchingLines) {
      const existing = seasonPitching.get(line.playerId) ?? createEmptyPitchingStats();
      const isStarter = starterPitcherIds.has(line.playerId);
      seasonPitching.set(line.playerId, accumulatePitching(existing, line, isStarter));
    }
  }

  // Step 5: Fetch player -> team_id mapping from rosters
  const { data: rosterRows, error: rosterError } = await supabase
    .from('rosters')
    .select('player_id, team_id')
    .eq('league_id', leagueId)
    .in('player_id', playerIdArray);

  if (rosterError) {
    throw {
      category: 'EXTERNAL',
      code: 'STATS_ACCUMULATION_FAILED',
      message: `Failed to fetch roster mapping: ${rosterError.message}`,
    };
  }

  const playerTeamMap = new Map<string, string>();
  for (const row of rosterRows ?? []) {
    playerTeamMap.set(row.player_id, row.team_id);
  }

  // Step 6: Build upsert rows
  const upsertRows: Array<{
    league_id: string;
    player_id: string;
    season_year: number;
    team_id: string;
    batting_stats: BattingStats | null;
    pitching_stats: PitchingStats | null;
  }> = [];

  for (const playerId of allPlayerIds) {
    const teamId = playerTeamMap.get(playerId);
    if (!teamId) continue; // Skip players not on a roster (shouldn't happen)

    upsertRows.push({
      league_id: leagueId,
      player_id: playerId,
      season_year: seasonYear,
      team_id: teamId,
      batting_stats: seasonBatting.get(playerId) ?? null,
      pitching_stats: seasonPitching.get(playerId) ?? null,
    });
  }

  if (upsertRows.length === 0) return;

  // Step 7: Upsert to season_stats
  const { error: upsertError } = await supabase
    .from('season_stats')
    .upsert(upsertRows, { onConflict: 'league_id,player_id' });

  if (upsertError) {
    throw {
      category: 'EXTERNAL',
      code: 'STATS_ACCUMULATION_FAILED',
      message: `Failed to upsert season stats: ${upsertError.message}`,
    };
  }
}
