/**
 * Playoff Game Simulation
 *
 * REQ-LGE-008: Simulate one playoff game at a time.
 *
 * Pipeline:
 * 1. Load bracket from league
 * 2. Advance winners (fill empty slots from completed series)
 * 3. Find next game
 * 4. Load rosters for both teams
 * 5. Build game config and run simulation
 * 6. Record result, advance winners, check completion
 * 7. Persist updated bracket (and status if complete)
 * 8. Insert game_log entry
 *
 * Layer 2: API infrastructure.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FullPlayoffBracket, PlayoffRoundName } from '../../src/lib/types/schedule';
import { runGame } from '../../src/lib/simulation/game-runner';
import type { RunGameConfig } from '../../src/lib/simulation/game-runner';
import { loadTeamConfig } from './load-team-config';
import {
  getNextFullBracketGame,
  recordFullBracketGameResult,
  advanceFullBracketWinners,
  isFullBracketComplete,
} from '../../src/lib/schedule/playoff-bracket';

export interface PlayoffGameSimResult {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  round: PlayoffRoundName;
  seriesId: string;
  gameNumber: number;
  isPlayoffsComplete: boolean;
}

/**
 * Simulate one playoff game. Returns null if no game available.
 */
export async function simulatePlayoffGame(
  supabase: SupabaseClient,
  leagueId: string,
  seed: number,
): Promise<PlayoffGameSimResult | null> {
  // Step 1: Load bracket
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('playoff_bracket')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league?.playoff_bracket) {
    return null;
  }

  let bracket = league.playoff_bracket as unknown as FullPlayoffBracket;

  // Step 2: Advance winners to fill empty slots
  bracket = advanceFullBracketWinners(bracket);

  // Step 3: Find next game
  const nextGame = getNextFullBracketGame(bracket);
  if (!nextGame) {
    return null;
  }

  // Step 4: Load rosters for both teams
  const [homeConfig, awayConfig] = await Promise.all([
    loadTeamConfig(supabase, nextGame.homeTeamId),
    loadTeamConfig(supabase, nextGame.awayTeamId),
  ]);

  // Step 5: Build game config and run
  const gameConfig: RunGameConfig = {
    gameId: `playoff-${nextGame.seriesId}-g${nextGame.gameNumber}`,
    seed,
    homeTeamId: nextGame.homeTeamId,
    awayTeamId: nextGame.awayTeamId,
    homeLineup: homeConfig.lineup,
    awayLineup: awayConfig.lineup,
    homeBatterCards: homeConfig.batterCards,
    awayBatterCards: awayConfig.batterCards,
    homeStartingPitcher: homeConfig.startingPitcher,
    awayStartingPitcher: awayConfig.startingPitcher,
    homeBullpen: homeConfig.bullpen,
    awayBullpen: awayConfig.bullpen,
    homeCloser: homeConfig.closer,
    awayCloser: awayConfig.closer,
    homeManagerStyle: homeConfig.managerStyle,
    awayManagerStyle: awayConfig.managerStyle,
    homeBench: homeConfig.bench,
    awayBench: awayConfig.bench,
  };

  const gameResult = runGame(gameConfig);

  // Step 6: Record result and advance
  bracket = recordFullBracketGameResult(
    bracket,
    nextGame.seriesId,
    nextGame.gameNumber,
    gameResult.homeScore,
    gameResult.awayScore,
  );

  bracket = advanceFullBracketWinners(bracket);

  const isComplete = isFullBracketComplete(bracket);

  // Step 7: Persist bracket (and status if complete)
  const updatePayload: Record<string, unknown> = {
    playoff_bracket: bracket as unknown as Record<string, unknown>,
  };
  if (isComplete) {
    updatePayload.status = 'completed';
  }

  const { error: updateError } = await supabase
    .from('leagues')
    .update(updatePayload)
    .eq('id', leagueId);

  if (updateError) {
    throw {
      category: 'EXTERNAL',
      code: 'PLAYOFF_GAME_FAILED',
      message: `Failed to persist bracket: ${updateError.message}`,
    };
  }

  // Step 8: Insert game_log
  await supabase
    .from('game_logs')
    .insert({
      league_id: leagueId,
      day_number: 163, // Playoff games are day 163+
      game_id: gameConfig.gameId,
      home_team_id: nextGame.homeTeamId,
      away_team_id: nextGame.awayTeamId,
      home_score: gameResult.homeScore,
      away_score: gameResult.awayScore,
      innings: gameResult.innings,
      winning_pitcher_id: gameResult.winningPitcherId,
      losing_pitcher_id: gameResult.losingPitcherId,
      save_pitcher_id: gameResult.savePitcherId,
      batting_lines: JSON.stringify(gameResult.playerBattingLines),
      pitching_lines: JSON.stringify(gameResult.playerPitchingLines),
    });

  return {
    homeTeamId: nextGame.homeTeamId,
    awayTeamId: nextGame.awayTeamId,
    homeScore: gameResult.homeScore,
    awayScore: gameResult.awayScore,
    round: nextGame.round,
    seriesId: nextGame.seriesId,
    gameNumber: nextGame.gameNumber,
    isPlayoffsComplete: isComplete,
  };
}
