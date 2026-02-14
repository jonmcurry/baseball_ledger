/**
 * Server-Side Day Simulation
 *
 * REQ-NFR-014: PostgreSQL transactions for post-simulation writes.
 * REQ-NFR-016: Denormalized standings atomic update.
 * REQ-NFR-010: Day-batched bulk simulation.
 *
 * Runs all games for a day using the simulation engine, then commits
 * results atomically via Supabase RPC (PostgreSQL transaction).
 *
 * Layer 2: API infrastructure.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { runDay } from '../../src/lib/simulation/season-runner';
import type { DayGameConfig, DayResult } from '../../src/lib/simulation/season-runner';

/**
 * Simulate a day's games on the server and commit results atomically.
 *
 * Steps:
 * 1. Run all games for the day using runDay()
 * 2. Call simulate_day_commit RPC to atomically:
 *    - Insert game_log rows
 *    - Update season_stats with batting/pitching deltas
 *    - Update teams table with W/L and run totals
 * 3. Advance the league's current_day
 *
 * @param supabase - Server-side Supabase client
 * @param leagueId - League ID
 * @param dayNumber - Day number to simulate
 * @param games - Game configurations (pre-loaded with team data)
 * @param baseSeed - RNG seed for determinism
 * @returns DayResult with compact game results
 */
export async function simulateDayOnServer(
  supabase: SupabaseClient,
  leagueId: string,
  dayNumber: number,
  games: DayGameConfig[],
  baseSeed: number,
): Promise<DayResult> {
  // Step 1: Run the simulation (pure, deterministic)
  const dayResult = runDay(dayNumber, games, baseSeed);

  // Step 2: Build game log entries for database insert
  const gameLogEntries = dayResult.games.map((game) => ({
    league_id: leagueId,
    day_number: dayNumber,
    game_id: game.gameId,
    home_team_id: game.homeTeamId,
    away_team_id: game.awayTeamId,
    home_score: game.homeScore,
    away_score: game.awayScore,
    innings: game.innings,
    winning_pitcher_id: game.winningPitcherId,
    losing_pitcher_id: game.losingPitcherId,
    save_pitcher_id: game.savePitcherId,
    batting_lines: JSON.stringify(game.playerBattingLines),
    pitching_lines: JSON.stringify(game.playerPitchingLines),
    box_score: JSON.stringify(game.boxScore),
    play_by_play: JSON.stringify(game.playByPlay),
  }));

  // Step 3: Build standings deltas (including home/away splits)
  const standingsDeltas: Record<string, {
    wins: number; losses: number; rs: number; ra: number;
    hw: number; hl: number; aw: number; al: number;
  }> = {};
  for (const game of dayResult.games) {
    const homeWon = game.homeScore > game.awayScore;

    if (!standingsDeltas[game.homeTeamId]) {
      standingsDeltas[game.homeTeamId] = { wins: 0, losses: 0, rs: 0, ra: 0, hw: 0, hl: 0, aw: 0, al: 0 };
    }
    if (!standingsDeltas[game.awayTeamId]) {
      standingsDeltas[game.awayTeamId] = { wins: 0, losses: 0, rs: 0, ra: 0, hw: 0, hl: 0, aw: 0, al: 0 };
    }

    standingsDeltas[game.homeTeamId].rs += game.homeScore;
    standingsDeltas[game.homeTeamId].ra += game.awayScore;
    standingsDeltas[game.awayTeamId].rs += game.awayScore;
    standingsDeltas[game.awayTeamId].ra += game.homeScore;

    if (homeWon) {
      standingsDeltas[game.homeTeamId].wins++;
      standingsDeltas[game.homeTeamId].hw++;
      standingsDeltas[game.awayTeamId].losses++;
      standingsDeltas[game.awayTeamId].al++;
    } else {
      standingsDeltas[game.awayTeamId].wins++;
      standingsDeltas[game.awayTeamId].aw++;
      standingsDeltas[game.homeTeamId].losses++;
      standingsDeltas[game.homeTeamId].hl++;
    }
  }

  // Step 4: Commit atomically via RPC
  const { error: rpcError } = await supabase.rpc('simulate_day_commit', {
    p_league_id: leagueId,
    p_day_number: dayNumber,
    p_game_logs: gameLogEntries,
    p_standings_deltas: standingsDeltas,
  });

  if (rpcError) {
    throw { category: 'EXTERNAL', code: 'SIMULATION_COMMIT_FAILED', message: `Failed to commit day ${dayNumber}: ${rpcError.message}` };
  }

  // Step 5: Advance league day
  const { error: updateError } = await supabase
    .from('leagues')
    .update({ current_day: dayNumber })
    .eq('id', leagueId);

  if (updateError) {
    throw { category: 'EXTERNAL', code: 'LEAGUE_UPDATE_FAILED', message: `Failed to advance day: ${updateError.message}` };
  }

  return dayResult;
}
