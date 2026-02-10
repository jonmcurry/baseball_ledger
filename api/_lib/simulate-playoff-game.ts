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
import type { FullPlayoffBracket, PlayoffRoundName } from '@lib/types/schedule';
import type { PlayerCard, Position } from '@lib/types/player';
import type { ManagerStyle } from '@lib/simulation/manager-profiles';
import { runGame } from '@lib/simulation/game-runner';
import type { RunGameConfig } from '@lib/simulation/game-runner';
import {
  getNextFullBracketGame,
  recordFullBracketGameResult,
  advanceFullBracketWinners,
  isFullBracketComplete,
} from '@lib/schedule/playoff-bracket';

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
      batting_lines: JSON.stringify(gameResult.battingLines),
      pitching_lines: JSON.stringify(gameResult.pitchingLines),
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

// ---------------------------------------------------------------------------
// Roster Loading
// ---------------------------------------------------------------------------

interface TeamConfig {
  lineup: { playerId: string; playerName: string; position: Position }[];
  batterCards: Map<string, PlayerCard>;
  startingPitcher: PlayerCard;
  bullpen: PlayerCard[];
  closer: PlayerCard | null;
  bench: PlayerCard[];
  managerStyle: ManagerStyle;
}

async function loadTeamConfig(
  supabase: SupabaseClient,
  teamId: string,
): Promise<TeamConfig> {
  // Load roster entries
  const { data: rosterEntries } = await supabase
    .from('rosters')
    .select('player_id, player_card, roster_slot, lineup_order, lineup_position')
    .eq('team_id', teamId);

  // Load manager profile
  const { data: team } = await supabase
    .from('teams')
    .select('manager_profile')
    .eq('id', teamId)
    .single();

  const entries = rosterEntries ?? [];
  const managerStyle = (team?.manager_profile ?? 'balanced') as ManagerStyle;

  // Build lineup from starters (sorted by lineup_order)
  const starters = entries
    .filter((e: { roster_slot: string }) => e.roster_slot === 'starter')
    .sort((a: { lineup_order: number | null }, b: { lineup_order: number | null }) =>
      (a.lineup_order ?? 99) - (b.lineup_order ?? 99));

  const lineup = starters.map((s: {
    player_id: string;
    player_card: Record<string, unknown>;
    lineup_position: string | null;
  }) => ({
    playerId: s.player_id,
    playerName: `${(s.player_card as unknown as PlayerCard).nameFirst} ${(s.player_card as unknown as PlayerCard).nameLast}`,
    position: (s.lineup_position ?? 'DH') as Position,
  }));

  // Build batter card map from starters + bench
  const batterCards = new Map<string, PlayerCard>();
  const benchEntries = entries.filter((e: { roster_slot: string }) => e.roster_slot === 'bench' || e.roster_slot === 'starter');
  for (const e of benchEntries) {
    batterCards.set(
      (e as { player_id: string }).player_id,
      (e as { player_card: unknown }).player_card as unknown as PlayerCard,
    );
  }

  // Starting pitcher (first rotation entry)
  const rotationEntries = entries.filter((e: { roster_slot: string }) => e.roster_slot === 'rotation');
  const startingPitcher = rotationEntries.length > 0
    ? (rotationEntries[0] as { player_card: unknown }).player_card as unknown as PlayerCard
    : createFallbackPitcher();

  // Bullpen
  const bullpenEntries = entries.filter((e: { roster_slot: string }) => e.roster_slot === 'bullpen');
  const bullpen = bullpenEntries.map(
    (e: { player_card: unknown }) => (e as { player_card: unknown }).player_card as unknown as PlayerCard,
  );

  // Closer
  const closerEntries = entries.filter((e: { roster_slot: string }) => e.roster_slot === 'closer');
  const closer = closerEntries.length > 0
    ? (closerEntries[0] as { player_card: unknown }).player_card as unknown as PlayerCard
    : null;

  // Bench position players
  const benchOnly = entries.filter((e: { roster_slot: string }) => e.roster_slot === 'bench');
  const bench = benchOnly.map(
    (e: { player_card: unknown }) => (e as { player_card: unknown }).player_card as unknown as PlayerCard,
  );

  return { lineup, batterCards, startingPitcher, bullpen, closer, bench, managerStyle };
}

function createFallbackPitcher(): PlayerCard {
  return {
    playerId: 'fallback-pitcher',
    nameFirst: 'Default',
    nameLast: 'Pitcher',
    yearId: 2023,
    cardValues: new Array(35).fill(7),
    pitcherGrade: 5,
    positions: ['P'],
    powerRating: 13,
    speedRating: 5,
    archetypeFlags: [7, 0],
  } as PlayerCard;
}
